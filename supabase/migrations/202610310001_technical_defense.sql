-- Módulo opcional: no altera entregas, evaluaciones ni roles existentes.
begin;

create table if not exists public.defense_configs (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  config jsonb not null,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid not null references public.profiles(id)
);
create table if not exists public.defense_sessions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id),
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  config jsonb not null,
  questions jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  submit_reason text check (submit_reason in ('manual','time','exits')),
  exits integer not null default 0 check (exits >= 0),
  paste_attempts integer not null default 0 check (paste_attempts >= 0),
  revision integer not null default 0,
  constraint defense_closed_state check ((status = 'in_progress' and submitted_at is null and submit_reason is null) or (status = 'submitted' and submitted_at is not null and submit_reason is not null))
);
create table if not exists public.defense_events (
  session_id uuid not null references public.defense_sessions(id) on delete cascade,
  nonce uuid not null,
  kind text not null check (kind in ('exit','paste')),
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (session_id, nonce)
);
alter table public.defense_configs enable row level security;
alter table public.defense_sessions enable row level security;
alter table public.defense_events enable row level security;
revoke all on public.defense_configs, public.defense_sessions, public.defense_events from anon, authenticated;
grant select on public.defense_configs, public.defense_sessions, public.defense_events to authenticated;

create policy defense_config_read on public.defense_configs for select to authenticated using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('evaluator','admin'))
  or exists(select 1 from public.challenges c where c.id = challenge_id and c.is_active)
);
create policy defense_session_read on public.defense_sessions for select to authenticated using (
  candidate_id = auth.uid()
);
create policy defense_event_read on public.defense_events for select to authenticated using (
  exists(select 1 from public.defense_sessions s where s.id = session_id)
);

create or replace function public.save_defense_config(p_challenge_id uuid, p_config jsonb, p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_requirements text[]; v_old timestamptz; v_question jsonb; v_questions jsonb := '[]';
  v_indices integer[] := '{}'; v_index integer; v_enabled integer := 0; v_config jsonb; v_updated timestamptz;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id = auth.uid() and role in ('evaluator','admin')) then raise exception 'Acceso denegado' using errcode = '42501'; end if;
  select requirements into v_requirements from public.challenges where id = p_challenge_id for share;
  if not found then raise exception 'Desafío no disponible' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_challenge_id::text, 310));
  select updated_at into v_old from public.defense_configs where challenge_id = p_challenge_id for update;
  if v_old is distinct from p_expected_updated_at then raise exception 'La configuración cambió; recarga antes de guardar' using errcode = '40001'; end if;
  if jsonb_typeof(p_config) is distinct from 'object'
    or jsonb_typeof(p_config->'enabled') is distinct from 'boolean'
    or jsonb_typeof(p_config->'block_paste') is distinct from 'boolean'
    or (p_config->>'duration_minutes') not in ('20','30','45') or p_config->>'duration_minutes' is null
    or (p_config->>'max_exits') not in ('1','2','3') or p_config->>'max_exits' is null
    or jsonb_typeof(p_config->'instructions') is distinct from 'string' or length(p_config->>'instructions') > 10000
    or jsonb_typeof(p_config->'questions') is distinct from 'array' then raise exception 'Configuración inválida' using errcode = '22023'; end if;
  if jsonb_array_length(p_config->'questions') not between 1 and 50 then raise exception 'Cantidad de preguntas inválida' using errcode = '22023'; end if;
  for v_question in select value from jsonb_array_elements(p_config->'questions') loop
    if coalesce(v_question->>'requirement_index','') !~ '^[0-9]{1,2}$' or jsonb_typeof(v_question->'enabled') is distinct from 'boolean' or jsonb_typeof(v_question->'prompt') is distinct from 'string' or length(trim(v_question->>'prompt')) not between 1 and 2000 then raise exception 'Pregunta inválida' using errcode = '22023'; end if;
    v_index := (v_question->>'requirement_index')::integer;
    if v_index < 0 or v_index >= coalesce(array_length(v_requirements,1),0) or v_index = any(v_indices) then raise exception 'Requisito inválido o repetido' using errcode = '22023'; end if;
    v_indices := array_append(v_indices,v_index);
    if (v_question->>'enabled')::boolean then v_enabled := v_enabled + 1; end if;
    v_questions := v_questions || jsonb_build_array(jsonb_build_object('requirement_index',v_index,'requirement',v_requirements[v_index+1],'prompt',trim(v_question->>'prompt'),'enabled',(v_question->>'enabled')::boolean));
  end loop;
  if v_enabled = 0 then raise exception 'Incluye al menos un requisito' using errcode = '22023'; end if;
  if jsonb_typeof(p_config->'weights') is distinct from 'object'
    or coalesce(p_config->'weights'->>'code','') !~ '^[0-9]{1,3}$'
    or coalesce(p_config->'weights'->>'explanation','') !~ '^[0-9]{1,3}$'
    or coalesce(p_config->'weights'->>'clarity','') !~ '^[0-9]{1,3}$' then raise exception 'Pesos inválidos' using errcode = '22023'; end if;
  if (p_config->'weights'->>'code')::integer > 100 or (p_config->'weights'->>'explanation')::integer > 100 or (p_config->'weights'->>'clarity')::integer > 100 or (p_config->'weights'->>'code')::integer + (p_config->'weights'->>'explanation')::integer + (p_config->'weights'->>'clarity')::integer <> 100 then raise exception 'Los pesos deben sumar 100' using errcode = '22023'; end if;
  v_config := jsonb_build_object('enabled',(p_config->>'enabled')::boolean,'block_paste',(p_config->>'block_paste')::boolean,'duration_minutes',(p_config->>'duration_minutes')::integer,'max_exits',(p_config->>'max_exits')::integer,'instructions',p_config->>'instructions','questions',v_questions,'weights',p_config->'weights');
  insert into public.defense_configs(challenge_id, config, updated_by) values(p_challenge_id,v_config,auth.uid())
    on conflict(challenge_id) do update set config=excluded.config,updated_by=excluded.updated_by,updated_at=clock_timestamp() returning updated_at into v_updated;
  return jsonb_build_object('config',v_config,'updated_at',v_updated);
end; $$;

create or replace function public.defense_action(p_submission_id uuid, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_submission public.submissions; v_config jsonb; v_session public.defense_sessions;
  v_questions jsonb; v_pair record; v_event uuid; v_inserted integer; v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Inicia sesión' using errcode = '42501'; end if;
  if p_action not in ('get','start','save','event','submit') then raise exception 'Acción inválida' using errcode = '22023'; end if;
  select * into v_submission from public.submissions where id=p_submission_id and user_id=auth.uid() and status='submitted';
  if not found then raise exception 'Entrega no disponible' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text,311));
  v_now := clock_timestamp();
  select config into v_config from public.defense_configs where challenge_id=v_submission.challenge_id;
  select * into v_session from public.defense_sessions where submission_id=p_submission_id for update;
  if p_action='start' and v_session.id is null then
    if coalesce((v_config->>'enabled')::boolean,false) is not true then raise exception 'Defensa no habilitada' using errcode='22023'; end if;
    select coalesce(jsonb_agg(q.value order by (q.value->>'requirement_index')::integer),'[]'::jsonb) into v_questions from jsonb_array_elements(v_config->'questions') q where (q.value->>'enabled')::boolean;
    if jsonb_array_length(v_questions)=0 then raise exception 'No hay preguntas configuradas' using errcode='22023'; end if;
    if coalesce(p_payload->>'accepted','false') <> 'true' then raise exception 'Debes aceptar las indicaciones' using errcode='22023'; end if;
    insert into public.defense_sessions(submission_id,candidate_id,config,questions,expires_at)
      values(p_submission_id,auth.uid(),v_config,v_questions,v_now+make_interval(mins => (v_config->>'duration_minutes')::integer)) returning * into v_session;
  end if;
  if v_session.id is not null and v_session.status='in_progress' and (v_now >= v_session.expires_at or v_session.exits >= (v_session.config->>'max_exits')::integer) then
    update public.defense_sessions set status='submitted',submitted_at=least(v_now,expires_at),submit_reason=case when v_now >= expires_at then 'time' else 'exits' end,revision=revision+1 where id=v_session.id returning * into v_session;
  end if;
  if p_action in ('save','event','submit') and v_session.id is null then raise exception 'La defensa no comenzó' using errcode='22023'; end if;
  if v_session.status='in_progress' and p_action in ('save','submit') then
    if coalesce(p_payload->>'revision','') !~ '^[0-9]{1,10}$' or (p_payload->>'revision')::bigint <> v_session.revision then raise exception 'La sesión cambió; recarga para continuar' using errcode='40001'; end if;
    if jsonb_typeof(p_payload->'answers') is distinct from 'object' or octet_length((p_payload->'answers')::text)>1000000 then raise exception 'Respuestas inválidas' using errcode='22023'; end if;
    for v_pair in select key,value from jsonb_each(p_payload->'answers') loop
      if v_pair.key !~ '^[0-9]{1,2}$' or jsonb_typeof(v_pair.value) is distinct from 'string' or length(v_pair.value#>>'{}')>10000 then raise exception 'Respuesta inválida' using errcode='22023'; end if;
      if v_pair.key::integer >= jsonb_array_length(v_session.questions) then raise exception 'Pregunta desconocida' using errcode='22023'; end if;
    end loop;
    update public.defense_sessions set answers=p_payload->'answers',revision=revision+1,
      status=case when p_action='submit' then 'submitted' else status end,
      submitted_at=case when p_action='submit' then v_now else null end,
      submit_reason=case when p_action='submit' then 'manual' else null end where id=v_session.id returning * into v_session;
  end if;
  if v_session.status='in_progress' and p_action='event' then
    if p_payload->>'kind' not in ('exit','paste') or p_payload->>'kind' is null then raise exception 'Evento inválido' using errcode='22023'; end if;
    v_event := (p_payload->>'nonce')::uuid;
    insert into public.defense_events(session_id,nonce,kind) values(v_session.id,v_event,p_payload->>'kind') on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted=1 then
      update public.defense_sessions set exits=exits+case when p_payload->>'kind'='exit' then 1 else 0 end,paste_attempts=paste_attempts+case when p_payload->>'kind'='paste' then 1 else 0 end where id=v_session.id returning * into v_session;
      if v_session.exits >= (v_session.config->>'max_exits')::integer then update public.defense_sessions set status='submitted',submitted_at=v_now,submit_reason='exits',revision=revision+1 where id=v_session.id returning * into v_session; end if;
    end if;
  end if;
  return jsonb_build_object('config',case when v_session.id is not null then v_session.config else v_config end,'session',case when v_session.id is null then null else to_jsonb(v_session)-'candidate_id'-'submission_id' end,'server_time',clock_timestamp());
end; $$;

revoke all on function public.save_defense_config(uuid,jsonb,timestamptz) from public, anon;
revoke all on function public.defense_action(uuid,text,jsonb) from public, anon;
grant execute on function public.save_defense_config(uuid,jsonb,timestamptz) to authenticated;
grant execute on function public.defense_action(uuid,text,jsonb) to authenticated;

-- La consulta de revisión verifica la asignación con visibilidad completa del servidor.
-- No concede SELECT directo a evaluadores sobre respuestas de otros candidatos.
create or replace function public.get_defense_for_review(p_submission_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_session public.defense_sessions; v_now timestamptz;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if auth.uid() is null or v_role is null or v_role not in ('evaluator','admin') then raise exception 'Acceso denegado' using errcode='42501'; end if;
  if not exists(select 1 from public.submissions where id=p_submission_id and status='submitted') then raise exception 'Entrega no disponible' using errcode='P0002'; end if;
  if v_role <> 'admin' and exists(select 1 from public.evaluations where submission_id=p_submission_id and evaluator_id<>auth.uid()) then raise exception 'Otra asignación' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text,311));
  v_now := clock_timestamp();
  select * into v_session from public.defense_sessions where submission_id=p_submission_id for update;
  if v_session.id is not null and v_session.status='in_progress' and v_now >= v_session.expires_at then
    update public.defense_sessions set status='submitted',submitted_at=expires_at,submit_reason='time',revision=revision+1 where id=v_session.id returning * into v_session;
  end if;
  return jsonb_build_object('session',case when v_session.status='submitted' then to_jsonb(v_session)-'candidate_id'-'submission_id' else null end);
end; $$;
revoke all on function public.get_defense_for_review(uuid) from public, anon;
grant execute on function public.get_defense_for_review(uuid) to authenticated;
commit;
