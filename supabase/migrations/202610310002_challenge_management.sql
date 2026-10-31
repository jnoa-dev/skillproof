begin;
create table public.challenge_editor_state (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  context text not null default '',
  difficulty_unset boolean not null default false,
  version integer not null default 1,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid not null references public.profiles(id)
);
alter table public.challenge_editor_state enable row level security;
revoke all on public.challenge_editor_state from public, anon, authenticated;
grant select on public.challenge_editor_state to authenticated;
create policy challenge_context_read on public.challenge_editor_state for select to authenticated using (
  exists(select 1 from public.challenges c where c.id=challenge_id and c.is_active)
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

create function public.challenge_slug_available(p_slug text,p_id uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Acceso denegado' using errcode='42501'; end if;
  return not exists(select 1 from public.challenges where slug=p_slug and (p_id is null or id<>p_id));
end; $$;

create function public.read_managed_challenges(p_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_challenge public.challenges; v_state public.challenge_editor_state; v_criteria jsonb;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Acceso denegado' using errcode='42501'; end if;
  if p_id is null then
    return jsonb_build_object('challenges',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'slug',c.slug,'is_active',c.is_active,'created_at',c.created_at,'participants',(select count(distinct s.user_id) from public.submissions s where s.challenge_id=c.id)) order by c.created_at desc) from public.challenges c),'[]'::jsonb));
  end if;
  select * into v_challenge from public.challenges where id=p_id;
  if not found then raise exception 'Desafío no disponible' using errcode='P0002'; end if;
  select * into v_state from public.challenge_editor_state where challenge_id=p_id;
  select coalesce(jsonb_agg(jsonb_build_object('title',title,'description',description,'max_score',max_score,'weight',weight) order by position),'[]'::jsonb) into v_criteria from public.rubric_criteria where challenge_id=p_id and is_active;
  return jsonb_build_object('challenge',to_jsonb(v_challenge)||jsonb_build_object('context',coalesce(v_state.context,''),'version',coalesce(v_state.version,0),'difficulty',case when v_state.difficulty_unset then '' else v_challenge.difficulty end,'criteria',v_criteria),'participants',(select count(distinct user_id) from public.submissions where challenge_id=p_id),'updated_at',v_state.updated_at);
end; $$;

create function public.save_managed_challenge(p_data jsonb,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_old public.challenges; v_version integer; v_count integer; v_active boolean; v_item jsonb; v_position integer:=0; v_weights numeric:=0; v_requirements text[]; v_deliverables text[];
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Acceso denegado' using errcode='42501'; end if;
  if p_action is null or p_action not in ('save','activate','visibility') or jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_data->'is_active') is distinct from 'boolean' or coalesce(p_data->>'version','') !~ '^[0-9]{1,9}$' then raise exception 'Datos inválidos' using errcode='22023'; end if;
  v_id := (p_data->>'id')::uuid;
  if v_id is not null then
    select * into v_old from public.challenges where id=v_id for update;
    if not found then raise exception 'Desafío no disponible' using errcode='P0002'; end if;
    select version into v_version from public.challenge_editor_state where challenge_id=v_id for update;
    if coalesce(v_version,0)<>(p_data->>'version')::integer then raise exception 'Conflicto de versión' using errcode='40001'; end if;
    select count(*) into v_count from public.submissions where challenge_id=v_id;
    if p_action<>'visibility' and v_count>0 then raise exception 'Contenido bloqueado por participaciones' using errcode='55000'; end if;
  elsif p_action='visibility' then raise exception 'Falta el desafío' using errcode='22023'; end if;
  v_active := p_action='activate' or (p_data->>'is_active')::boolean;
  if p_action='visibility' then
    if coalesce(v_count,0)=0 then raise exception 'Usa el guardado con validación para modificar la publicación' using errcode='22023'; end if;
    if v_active and (length(trim(v_old.title))=0 or length(trim(v_old.description))=0 or not exists(select 1 from public.rubric_criteria where challenge_id=v_id and is_active)) then raise exception 'Desafío incompleto' using errcode='22023'; end if;
    update public.challenges set is_active=v_active where id=v_id;
    insert into public.challenge_editor_state(challenge_id,version,updated_by) values(v_id,1,auth.uid()) on conflict(challenge_id) do update set version=challenge_editor_state.version+1,updated_at=clock_timestamp(),updated_by=auth.uid();
    return public.read_managed_challenges(v_id);
  end if;
  if jsonb_typeof(p_data->'title') is distinct from 'string' or length(trim(p_data->>'title')) not between 1 and 80
    or jsonb_typeof(p_data->'slug') is distinct from 'string' or length(p_data->>'slug') not between 3 and 30 or p_data->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or jsonb_typeof(p_data->'description') is distinct from 'string' or length(p_data->>'description')>160
    or jsonb_typeof(p_data->'context') is distinct from 'string' or length(p_data->>'context')>1000
    or coalesce(p_data->>'difficulty','invalid') not in ('','beginner','intermediate','advanced')
    or jsonb_typeof(p_data->'requirements') is distinct from 'array' or jsonb_typeof(p_data->'deliverables') is distinct from 'array' or jsonb_typeof(p_data->'criteria') is distinct from 'array' then raise exception 'Campos inválidos' using errcode='22023'; end if;
  if jsonb_array_length(p_data->'requirements')>50 or jsonb_array_length(p_data->'deliverables')>50 or jsonb_array_length(p_data->'criteria')>20 then raise exception 'Demasiados elementos' using errcode='22023'; end if;
  for v_item in select value from jsonb_array_elements((p_data->'requirements')||(p_data->'deliverables')) loop
    if jsonb_typeof(v_item) is distinct from 'string' or length(trim(v_item#>>'{}')) not between 1 and 1000 then raise exception 'Elemento inválido' using errcode='22023'; end if;
  end loop;
  for v_item in select value from jsonb_array_elements(p_data->'criteria') loop
    if jsonb_typeof(v_item->'title') is distinct from 'string' or length(trim(v_item->>'title')) not between 1 and 120 or jsonb_typeof(v_item->'description') is distinct from 'string' or length(v_item->>'description')>2000 or coalesce(v_item->>'max_score','') !~ '^[0-9]{1,3}$' or coalesce(v_item->>'weight','') !~ '^[0-9]{1,3}$' then raise exception 'Criterio inválido' using errcode='22023'; end if;
    if (v_item->>'max_score')::integer not between 1 and 100 or (v_item->>'weight')::integer not between 1 and 100 then raise exception 'Puntaje inválido' using errcode='22023'; end if;
    v_weights := v_weights+(v_item->>'weight')::integer;
  end loop;
  if v_active and (length(trim(p_data->>'description'))=0 or length(trim(p_data->>'context'))=0 or p_data->>'difficulty'='' or jsonb_array_length(p_data->'requirements')=0 or jsonb_array_length(p_data->'deliverables')=0 or jsonb_array_length(p_data->'criteria')=0 or v_weights<>100) then raise exception 'Completa los campos para activar' using errcode='22023'; end if;
  select coalesce(array_agg(value),'{}') into v_requirements from jsonb_array_elements_text(p_data->'requirements');
  select coalesce(array_agg(value),'{}') into v_deliverables from jsonb_array_elements_text(p_data->'deliverables');
  if v_id is null then
    insert into public.challenges(title,slug,description,difficulty,requirements,deliverables,is_active) values(trim(p_data->>'title'),p_data->>'slug',p_data->>'description',coalesce(nullif(p_data->>'difficulty',''),'beginner'),v_requirements,v_deliverables,v_active) returning id into v_id;
  else
    update public.challenges set title=trim(p_data->>'title'),slug=p_data->>'slug',description=p_data->>'description',difficulty=coalesce(nullif(p_data->>'difficulty',''),'beginner'),requirements=v_requirements,deliverables=v_deliverables,is_active=v_active where id=v_id;
  end if;
  insert into public.challenge_editor_state(challenge_id,context,difficulty_unset,updated_by) values(v_id,p_data->>'context',p_data->>'difficulty'='',auth.uid()) on conflict(challenge_id) do update set context=excluded.context,difficulty_unset=excluded.difficulty_unset,updated_by=auth.uid(),version=challenge_editor_state.version+1,updated_at=clock_timestamp();
  -- Solo es posible reemplazar criterios si no hay participaciones ni evaluaciones.
  delete from public.rubric_criteria where challenge_id=v_id;
  for v_item in select value from jsonb_array_elements(p_data->'criteria') loop
    insert into public.rubric_criteria(challenge_id,criterion_key,title,description,max_score,weight,position,is_active) values(v_id,'criterion_'||v_position,trim(v_item->>'title'),v_item->>'description',(v_item->>'max_score')::integer,(v_item->>'weight')::integer,v_position,true);
    v_position:=v_position+1;
  end loop;
  return public.read_managed_challenges(v_id);
end; $$;
revoke all on function public.challenge_slug_available(text,uuid), public.read_managed_challenges(uuid), public.save_managed_challenge(jsonb,text) from public,anon;
grant execute on function public.challenge_slug_available(text,uuid), public.read_managed_challenges(uuid), public.save_managed_challenge(jsonb,text) to authenticated;
commit;
