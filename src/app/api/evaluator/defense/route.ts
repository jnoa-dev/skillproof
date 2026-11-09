import { createClient } from "@/lib/supabase/server";
import { defaultDefense, uuid, validateConfig } from "@/lib/defense/model";
import { defenseError, reply } from "@/lib/defense/server";

async function authorize() {
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { error: reply({ error: "Inicia sesión nuevamente." }, 401) };
  const profile = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile.error) return { error: reply({ error: "No pudimos verificar tu acceso." }, 500) };
  if (!profile.data || !["evaluator", "admin"].includes(profile.data.role)) return { error: reply({ error: "No tienes permiso para evaluar." }, 403) };
  return { db, user: data.user.id, admin: profile.data.role === "admin" };
}
export async function GET(request: Request) {
  try {
    const access = await authorize();
    if (access.error) return access.error;
    const params = new URL(request.url).searchParams;
    const submissionId = params.get("submissionId");
    if (submissionId) {
      if (!uuid(submissionId)) return reply({ error: "Entrega inválida." }, 400);
      const evaluation = await access.db.from("evaluations").select("evaluator_id").eq("submission_id", submissionId).maybeSingle();
      if (evaluation.error) return reply({ error: "No pudimos verificar la asignación." }, 500);
      if (evaluation.data && evaluation.data.evaluator_id !== access.user && !access.admin) return reply({ error: "Esta evaluación está asignada a otra persona." }, 403);
      const submission = await access.db.from("submissions").select("id").eq("id", submissionId).eq("status", "submitted").maybeSingle();
      if (submission.error || !submission.data) return reply({ error: "La entrega no está disponible." }, 404);
      const session = await access.db.rpc("get_defense_for_review", { p_submission_id: submissionId });
      if (session.error) return defenseError(session.error);
      return reply(session.data);
    }
    const challengeId = params.get("challengeId");
    if (!uuid(challengeId)) return reply({ error: "Desafío inválido." }, 400);
    const challenge = await access.db.from("challenges").select("id, title, requirements").eq("id", challengeId).maybeSingle();
    if (challenge.error || !challenge.data) return reply({ error: "El desafío no está disponible." }, 404);
    const config = await access.db.from("defense_configs").select("config, updated_at").eq("challenge_id", challengeId).maybeSingle();
    if (config.error) return defenseError(config.error);
    return reply({ title: challenge.data.title, config: config.data?.config || defaultDefense(challenge.data.requirements || []), updated_at: config.data?.updated_at || null });
  } catch { return reply({ error: "No pudimos cargar la defensa técnica." }, 500); }
}
export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return reply({ error: "Solicitud inválida." }, 400); }
  if (!body || !uuid(body.challengeId) || !(body.updated_at === null || (typeof body.updated_at === "string" && !Number.isNaN(Date.parse(body.updated_at))))) return reply({ error: "Datos inválidos." }, 400);
  const invalid = validateConfig(body.config);
  if (invalid) return reply({ error: invalid }, 400);
  try {
    const access = await authorize();
    if (access.error) return access.error;
    const result = await access.db.rpc("save_defense_config", { p_challenge_id: body.challengeId, p_config: body.config, p_expected_updated_at: body.updated_at });
    if (result.error) return defenseError(result.error);
    return reply(result.data);
  } catch { return reply({ error: "No pudimos confirmar los cambios." }, 500); }
}
