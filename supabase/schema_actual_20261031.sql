


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."can_access_recruiter_history"("target_candidate_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles recruiter
    join public.profiles candidate
      on candidate.id = target_candidate_id
    where recruiter.id = (select auth.uid())
      and recruiter.role in ('recruiter', 'admin')
      and candidate.recruiter_history_shared = true
  );
$$;


ALTER FUNCTION "public"."can_access_recruiter_history"("target_candidate_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_evaluation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  challenge_id uuid;
  total_weight numeric;
  missing_scores boolean;
begin
  if old.status = 'finalized' then
    raise exception 'Una evaluación finalizada no se puede modificar';
  end if;

  if new.submission_id <> old.submission_id
     or new.evaluator_id <> old.evaluator_id then
    raise exception 'No se puede cambiar la entrega ni el evaluador asignado';
  end if;

  new.updated_at := now();

  if new.status = 'finalized' then
    select s.challenge_id
      into challenge_id
    from public.submissions s
    where s.id = new.submission_id and s.status = 'submitted';

    if not found then
      raise exception 'La entrega debe estar enviada';
    end if;

    select coalesce(sum(c.weight), 0)
      into total_weight
    from public.rubric_criteria c
    where c.challenge_id = challenge_id and c.is_active;

    if total_weight <= 0 then
      raise exception 'El desafío no tiene criterios activos';
    end if;

    select exists (
      select 1
      from public.rubric_criteria c
      where c.challenge_id = challenge_id
        and c.is_active
        and not exists (
          select 1 from public.evaluation_scores es
          where es.evaluation_id = new.id
            and es.criterion_id = c.id
        )
    ) into missing_scores;

    if missing_scores then
      raise exception 'Falta puntuar uno o más criterios';
    end if;

    select round(
      100 * sum((es.score / c.max_score) * c.weight) / total_weight,
      2
    )
      into new.total_score
    from public.evaluation_scores es
    join public.rubric_criteria c on c.id = es.criterion_id
    where es.evaluation_id = new.id
      and c.is_active;

    new.finalized_at := now();
  else
    new.total_score := null;
    new.finalized_at := null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."finalize_evaluation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_passport"("p_slug" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'public_slug', p.public_slug,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'evaluations',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'challenge_title', c.title,
              'total_score', e.total_score,
              'finalized_at', e.finalized_at,
              'criteria',
                coalesce(
                  (
                    select jsonb_agg(
                      jsonb_build_object(
                        'title', rc.title,
                        'score', es.score,
                        'max_score', rc.max_score,
                        'weight', rc.weight
                      )
                      order by rc.position
                    )
                    from public.evaluation_scores es
                    join public.rubric_criteria rc
                      on rc.id = es.criterion_id
                    where es.evaluation_id = e.id
                      and rc.is_active
                  ),
                  '[]'::jsonb
                )
            )
            order by e.finalized_at desc
          )
          from public.submissions s
          join public.evaluations e
            on e.submission_id = s.id
          join public.challenges c
            on c.id = s.challenge_id
          where s.user_id = p.id
            and e.status = 'finalized'
        ),
        '[]'::jsonb
      )
  )
  from public.profiles p
  where p.public_slug = p_slug
    and p.passport_public = true;
$$;


ALTER FUNCTION "public"."get_public_passport"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_interview_review"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'finalized' then
      raise exception 'Finalized interview reviews cannot be changed';
    end if;

    if new.submission_id <> old.submission_id
       or new.candidate_id <> old.candidate_id
       or new.reviewer_id <> old.reviewer_id then
      raise exception 'Review participants and submission cannot be changed';
    end if;

    if new.status = 'finalized' then
      if new.understanding_score is null
         or new.adaptation_score is null
         or length(trim(new.evidence)) < 20 then
        raise exception 'Scores and evidence are required to finalize';
      end if;
      new.finalized_at := now();
    else
      new.finalized_at := null;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_interview_review"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'student',
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Estudiante'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_evaluation_score"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  criterion_max numeric(6,2);
  criterion_challenge uuid;
  submission_challenge uuid;
  evaluation_status text;
begin
  select c.max_score, c.challenge_id, s.challenge_id, e.status
    into criterion_max, criterion_challenge, submission_challenge, evaluation_status
  from public.evaluations e
  join public.submissions s on s.id = e.submission_id
  join public.rubric_criteria c on c.id = new.criterion_id
  where e.id = new.evaluation_id;

  if not found
     or criterion_challenge <> submission_challenge
     or new.score > criterion_max
     or evaluation_status <> 'draft' then
    raise exception 'Puntaje inválido para esta evaluación';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_evaluation_score"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "requirements" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "deliverables" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "difficulty" "text" DEFAULT 'beginner'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "challenges_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"])))
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evaluation_id" "uuid" NOT NULL,
    "criterion_id" "uuid" NOT NULL,
    "score" numeric(6,2) NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "evaluation_scores_score_check" CHECK (("score" >= (0)::numeric))
);


ALTER TABLE "public"."evaluation_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "evaluator_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "summary" "text" DEFAULT ''::"text" NOT NULL,
    "total_score" numeric(6,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finalized_at" timestamp with time zone,
    CONSTRAINT "evaluations_check" CHECK (((("status" = 'draft'::"text") AND ("total_score" IS NULL) AND ("finalized_at" IS NULL)) OR (("status" = 'finalized'::"text") AND ("total_score" IS NOT NULL) AND ("finalized_at" IS NOT NULL)))),
    CONSTRAINT "evaluations_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'finalized'::"text"])))
);


ALTER TABLE "public"."evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interview_review_responses" (
    "review_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "response" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "interview_review_responses_response_check" CHECK ((("length"(TRIM(BOTH FROM "response")) >= 1) AND ("length"(TRIM(BOTH FROM "response")) <= 10000)))
);


ALTER TABLE "public"."interview_review_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interview_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "understanding_score" smallint,
    "adaptation_score" smallint,
    "evidence" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finalized_at" timestamp with time zone,
    CONSTRAINT "interview_reviews_adaptation_score_check" CHECK ((("adaptation_score" >= 1) AND ("adaptation_score" <= 5))),
    CONSTRAINT "interview_reviews_check" CHECK (((("status" = 'draft'::"text") AND ("finalized_at" IS NULL)) OR (("status" = 'finalized'::"text") AND ("finalized_at" IS NOT NULL) AND ("understanding_score" IS NOT NULL) AND ("adaptation_score" IS NOT NULL)))),
    CONSTRAINT "interview_reviews_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'finalized'::"text"]))),
    CONSTRAINT "interview_reviews_understanding_score_check" CHECK ((("understanding_score" >= 1) AND ("understanding_score" <= 5)))
);


ALTER TABLE "public"."interview_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "display_name" "text" DEFAULT 'Estudiante'::"text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "public_slug" "text",
    "passport_public" boolean DEFAULT false NOT NULL,
    "recruiter_history_shared" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_display_name_check" CHECK (("char_length"("display_name") <= 80)),
    CONSTRAINT "profiles_public_slug_format_check" CHECK ((("public_slug" IS NULL) OR (("public_slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text") AND (("char_length"("public_slug") >= 3) AND ("char_length"("public_slug") <= 30))))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'evaluator'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rubric_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "criterion_key" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "max_score" numeric(6,2) DEFAULT 100 NOT NULL,
    "weight" numeric(6,2) NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rubric_criteria_max_score_check" CHECK (("max_score" > (0)::numeric)),
    CONSTRAINT "rubric_criteria_weight_check" CHECK ((("weight" > (0)::numeric) AND ("weight" <= (100)::numeric)))
);


ALTER TABLE "public"."rubric_criteria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "github_repo_url" "text",
    "documentation" "text",
    "justification" "text",
    "problem_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "submissions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text"]))),
    CONSTRAINT "submitted_submission_is_complete" CHECK ((("status" <> 'submitted'::"text") OR (("github_repo_url" ~* '^https://(www\.)?github\.com/[^/]+/[^/?#]+(\.git)?/?$'::"text") AND (NULLIF(TRIM(BOTH FROM "documentation"), ''::"text") IS NOT NULL) AND (NULLIF(TRIM(BOTH FROM "justification"), ''::"text") IS NOT NULL) AND (NULLIF(TRIM(BOTH FROM "problem_description"), ''::"text") IS NOT NULL))))
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_evaluation_id_criterion_id_key" UNIQUE ("evaluation_id", "criterion_id");



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_submission_id_key" UNIQUE ("submission_id");



ALTER TABLE ONLY "public"."interview_review_responses"
    ADD CONSTRAINT "interview_review_responses_pkey" PRIMARY KEY ("review_id");



ALTER TABLE ONLY "public"."interview_reviews"
    ADD CONSTRAINT "interview_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_reviews"
    ADD CONSTRAINT "interview_reviews_submission_id_reviewer_id_key" UNIQUE ("submission_id", "reviewer_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rubric_criteria"
    ADD CONSTRAINT "rubric_criteria_challenge_id_criterion_key_key" UNIQUE ("challenge_id", "criterion_key");



ALTER TABLE ONLY "public"."rubric_criteria"
    ADD CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



CREATE INDEX "evaluations_evaluator_status_idx" ON "public"."evaluations" USING "btree" ("evaluator_id", "status", "updated_at" DESC);



CREATE INDEX "interview_reviews_candidate_date_idx" ON "public"."interview_reviews" USING "btree" ("candidate_id", "finalized_at" DESC);



CREATE UNIQUE INDEX "profiles_public_slug_unique" ON "public"."profiles" USING "btree" ("public_slug") WHERE ("public_slug" IS NOT NULL);



CREATE INDEX "submissions_challenge_id_idx" ON "public"."submissions" USING "btree" ("challenge_id");



CREATE INDEX "submissions_status_challenge_idx" ON "public"."submissions" USING "btree" ("status", "challenge_id");



CREATE INDEX "submissions_user_id_idx" ON "public"."submissions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "finalize_evaluation" BEFORE UPDATE ON "public"."evaluations" FOR EACH ROW EXECUTE FUNCTION "public"."finalize_evaluation"();



CREATE OR REPLACE TRIGGER "guard_interview_review" BEFORE UPDATE ON "public"."interview_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."guard_interview_review"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "submissions_set_updated_at" BEFORE UPDATE ON "public"."submissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "validate_evaluation_score" BEFORE INSERT OR UPDATE ON "public"."evaluation_scores" FOR EACH ROW EXECUTE FUNCTION "public"."validate_evaluation_score"();



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "public"."rubric_criteria"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluation_scores"
    ADD CONSTRAINT "evaluation_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_review_responses"
    ADD CONSTRAINT "interview_review_responses_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_review_responses"
    ADD CONSTRAINT "interview_review_responses_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."interview_reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_reviews"
    ADD CONSTRAINT "interview_reviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_reviews"
    ADD CONSTRAINT "interview_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."interview_reviews"
    ADD CONSTRAINT "interview_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rubric_criteria"
    ADD CONSTRAINT "rubric_criteria_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can read rubric" ON "public"."rubric_criteria" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Candidates and authorized recruiters can read responses" ON "public"."interview_review_responses" FOR SELECT TO "authenticated" USING ((("candidate_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."can_access_recruiter_history"("candidate_id") OR (EXISTS ( SELECT 1
   FROM "public"."interview_reviews" "r"
  WHERE (("r"."id" = "interview_review_responses"."review_id") AND ("r"."reviewer_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Candidates can edit their responses" ON "public"."interview_review_responses" FOR UPDATE TO "authenticated" USING (("candidate_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("candidate_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Candidates can respond to finalized reviews" ON "public"."interview_review_responses" FOR INSERT TO "authenticated" WITH CHECK ((("candidate_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."interview_reviews" "r"
  WHERE (("r"."id" = "interview_review_responses"."review_id") AND ("r"."candidate_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("r"."status" = 'finalized'::"text"))))));



CREATE POLICY "Evaluators can add scores to drafts" ON "public"."evaluation_scores" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."evaluations" "e"
     JOIN "public"."profiles" "p" ON (("p"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("e"."id" = "evaluation_scores"."evaluation_id") AND ("e"."evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("e"."status" = 'draft'::"text") AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"]))))));



CREATE POLICY "Evaluators can create evaluations" ON "public"."evaluations" FOR INSERT TO "authenticated" WITH CHECK ((("evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'draft'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "evaluations"."submission_id") AND ("s"."status" = 'submitted'::"text"))))));



CREATE POLICY "Evaluators can delete scores on drafts" ON "public"."evaluation_scores" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."evaluations" "e"
     JOIN "public"."profiles" "p" ON (("p"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("e"."id" = "evaluation_scores"."evaluation_id") AND ("e"."evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("e"."status" = 'draft'::"text") AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"]))))));



CREATE POLICY "Evaluators can edit scores on drafts" ON "public"."evaluation_scores" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."evaluations" "e"
  WHERE (("e"."id" = "evaluation_scores"."evaluation_id") AND ("e"."evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("e"."status" = 'draft'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."evaluations" "e"
     JOIN "public"."profiles" "p" ON (("p"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("e"."id" = "evaluation_scores"."evaluation_id") AND ("e"."evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("e"."status" = 'draft'::"text") AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"]))))));



CREATE POLICY "Evaluators can manage rubric" ON "public"."rubric_criteria" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"]))))));



CREATE POLICY "Evaluators can read submitted work" ON "public"."submissions" FOR SELECT TO "authenticated" USING ((("status" = 'submitted'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"])))))));



CREATE POLICY "Evaluators can update own draft evaluations" ON "public"."evaluations" FOR UPDATE TO "authenticated" USING ((("evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'draft'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"]))))))) WITH CHECK ((("evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['evaluator'::"text", 'admin'::"text"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "evaluations"."submission_id") AND ("s"."status" = 'submitted'::"text"))))));



CREATE POLICY "Read assigned or own finalized evaluations" ON "public"."evaluations" FOR SELECT TO "authenticated" USING ((("evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'admin'::"text")))) OR (("status" = 'finalized'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "evaluations"."submission_id") AND ("s"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Read evaluation scores" ON "public"."evaluation_scores" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."evaluations" "e"
     JOIN "public"."submissions" "s" ON (("s"."id" = "e"."submission_id")))
  WHERE (("e"."id" = "evaluation_scores"."evaluation_id") AND (("e"."evaluator_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles" "p"
          WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'admin'::"text")))) OR (("e"."status" = 'finalized'::"text") AND ("s"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Recruiters can create interview reviews" ON "public"."interview_reviews" FOR INSERT TO "authenticated" WITH CHECK ((("reviewer_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("candidate_id" <> ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'draft'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['recruiter'::"text", 'evaluator'::"text", 'admin'::"text"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "interview_reviews"."submission_id") AND ("s"."user_id" = "interview_reviews"."candidate_id") AND ("s"."status" = 'submitted'::"text"))))));



CREATE POLICY "Review participants and consented recruiters can read" ON "public"."interview_reviews" FOR SELECT TO "authenticated" USING (((("candidate_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'finalized'::"text")) OR ("reviewer_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("status" = 'finalized'::"text") AND "public"."can_access_recruiter_history"("candidate_id"))));



CREATE POLICY "Reviewers can update their own drafts" ON "public"."interview_reviews" FOR UPDATE TO "authenticated" USING ((("reviewer_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'draft'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['recruiter'::"text", 'evaluator'::"text", 'admin'::"text"]))))))) WITH CHECK ((("reviewer_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "interview_reviews"."submission_id") AND ("s"."user_id" = "interview_reviews"."candidate_id") AND ("s"."status" = 'submitted'::"text"))))));



CREATE POLICY "authenticated read active challenges" ON "public"."challenges" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_review_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rubric_criteria" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students create own draft submissions" ON "public"."submissions" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'draft'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."challenges"
  WHERE (("challenges"."id" = "submissions"."challenge_id") AND ("challenges"."is_active" = true))))));



CREATE POLICY "students read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "students read own submissions" ON "public"."submissions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "students update own drafts" ON "public"."submissions" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'draft'::"text"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text"]))));



CREATE POLICY "students update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_access_recruiter_history"("target_candidate_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_access_recruiter_history"("target_candidate_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_public_passport"("p_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_passport"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_passport"("p_slug" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."challenges" TO "service_role";
GRANT SELECT ON TABLE "public"."challenges" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evaluation_scores" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_scores" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evaluation_scores" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evaluations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."evaluations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evaluations" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_review_responses" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."interview_review_responses" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_review_responses" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_reviews" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."interview_reviews" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."interview_reviews" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("avatar_url") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("public_slug") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("passport_public") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("recruiter_history_shared") ON TABLE "public"."profiles" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."rubric_criteria" TO "anon";
GRANT ALL ON TABLE "public"."rubric_criteria" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."rubric_criteria" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."submissions" TO "service_role";
GRANT SELECT ON TABLE "public"."submissions" TO "authenticated";



GRANT INSERT("user_id") ON TABLE "public"."submissions" TO "authenticated";



GRANT INSERT("challenge_id") ON TABLE "public"."submissions" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."submissions" TO "authenticated";



GRANT INSERT("github_repo_url"),UPDATE("github_repo_url") ON TABLE "public"."submissions" TO "authenticated";



GRANT INSERT("documentation"),UPDATE("documentation") ON TABLE "public"."submissions" TO "authenticated";



GRANT INSERT("justification"),UPDATE("justification") ON TABLE "public"."submissions" TO "authenticated";



GRANT INSERT("problem_description"),UPDATE("problem_description") ON TABLE "public"."submissions" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";







