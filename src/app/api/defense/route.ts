import { createClient } from "@/lib/supabase/server";
import { uuid, validAnswers } from "@/lib/defense/model";
import { defenseError, reply } from "@/lib/defense/server";

async function action(submissionId: string, action: string, payload: Record<string, unknown>) {
  try {
    const db = await createClient();
    const { data, error } = await db.auth.getUser();
    if (error || !data.user) return reply({ error: "Inicia sesión nuevamente." }, 401);
    const result = await db.rpc("defense_action", { p_submission_id: submissionId, p_action: action, p_payload: payload });
    if (result.error) return defenseError(result.error);
    return reply(result.data);
  } catch { return reply({ error: "No pudimos conectar con el servidor." }, 500); }
}
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("submissionId");
  if (!uuid(id)) return reply({ error: "Entrega inválida." }, 400);
  return action(id, "get", {});
}
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 1100000) return reply({ error: "Solicitud demasiado grande." }, 413);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "Solicitud inválida." }, 400); }
  if (!body || !uuid(body.submissionId) || !["start", "save", "submit", "event"].includes(body.action)) return reply({ error: "Acción inválida." }, 400);
  const payload = body.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return reply({ error: "Datos inválidos." }, 400);
  if (["save", "submit"].includes(body.action) && (!validAnswers(payload.answers) || !Number.isSafeInteger(payload.revision) || payload.revision < 0)) return reply({ error: "Respuestas inválidas." }, 400);
  if (body.action === "start" && payload.accepted !== true) return reply({ error: "Acepta las indicaciones para comenzar." }, 400);
  if (body.action === "event" && (!["exit", "paste"].includes(payload.kind) || !uuid(payload.nonce))) return reply({ error: "Evento inválido." }, 400);
  return action(body.submissionId, body.action, payload);
}
