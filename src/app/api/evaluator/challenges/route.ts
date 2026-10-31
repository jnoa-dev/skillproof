import { staffAccess } from "@/lib/evaluator/access";
import { reply } from "@/lib/defense/server";
import { uuid } from "@/lib/defense/model";
import { slugPattern, validateChallenge } from "@/lib/challenge-management/model";
function failure(error: { code?: string }) {
  if (["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code || "")) return reply({ error: "Falta habilitar la gestión de desafíos en Supabase. La migración está incluida en el proyecto.", unavailable: true }, 503);
  if (error.code === "23505") return reply({ error: "Este identificador ya está en uso. Prueba con otro.", field: "slug" }, 409);
  if (error.code === "40001") return reply({ error: "El desafío cambió. Recarga antes de guardar." }, 409);
  if (error.code === "55000") return reply({ error: "El desafío ya tiene participantes. Su contenido no se puede modificar." }, 409);
  if (error.code === "42501") return reply({ error: "No tienes permiso para gestionar desafíos." }, 403);
  if (error.code === "P0002") return reply({ error: "El desafío no está disponible." }, 404);
  if (["22023", "22P02"].includes(error.code || "")) return reply({ error: "Revisa los campos del desafío antes de guardar." }, 400);
  return reply({ error: "No pudimos completar la operación. Revisa los datos y reintenta." }, 500);
}
export async function GET(request: Request) {
  try {
    const access = await staffAccess(true); if (access.error) return access.error;
    const params = new URL(request.url).searchParams; const id = params.get("id"); const slug = params.get("slug");
    if (id && !uuid(id)) return reply({ error: "Desafío inválido." }, 400);
    if (slug !== null) {
      if (slug.length < 3 || slug.length > 30 || !slugPattern.test(slug)) return reply({ error: "Identificador inválido." }, 400);
      const result = await access.db.rpc("challenge_slug_available", { p_slug: slug, p_id: id });
      if (result.error) return failure(result.error); return reply({ available: result.data });
    }
    const result = await access.db.rpc("read_managed_challenges", { p_id: id });
    if (result.error) return failure(result.error); return reply(result.data);
  } catch { return reply({ error: "No pudimos cargar los desafíos." }, 500); }
}
export async function POST(request: Request) {
  let body; try { body = await request.json(); } catch { return reply({ error: "Solicitud inválida." }, 400); }
  if (!body || !["save", "activate", "visibility"].includes(body.action) || !body.challenge || !(body.challenge.id === null || uuid(body.challenge.id)) || !Number.isSafeInteger(body.challenge.version) || body.challenge.version < 0 || typeof body.challenge.is_active !== "boolean") return reply({ error: "Datos inválidos." }, 400);
  if (body.action !== "visibility") { const errors = validateChallenge(body.challenge, body.action === "activate" || body.challenge.is_active); if (Object.keys(errors).length) return reply({ error: "Corrige los campos señalados.", fields: errors }, 400); }
  try {
    const access = await staffAccess(true); if (access.error) return access.error;
    const result = await access.db.rpc("save_managed_challenge", { p_data: body.challenge, p_action: body.action });
    if (result.error) return failure(result.error); return reply(result.data);
  } catch { return reply({ error: "No pudimos confirmar el guardado. Conserva los cambios y revisa el estado antes de reintentar." }, 500); }
}
