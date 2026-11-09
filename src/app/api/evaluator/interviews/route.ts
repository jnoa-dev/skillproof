import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuid = (valor: unknown): valor is string => typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
const columnas = "id, reviewer_id, status, understanding_score, adaptation_score, evidence, created_at, finalized_at";
function responder(datos: unknown, status = 200) {
  return NextResponse.json(datos, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
async function autorizar(submissionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: responder({ error: "Inicia sesión nuevamente." }, 401) };
  const perfil = await supabase.from("profiles").select("role, display_name").eq("id", data.user.id).maybeSingle();
  if (perfil.error) return { error: responder({ error: "No pudimos verificar tu acceso." }, 500) };
  if (!perfil.data || !["evaluator", "admin"].includes(perfil.data.role)) return { error: responder({ error: "No tienes permiso para consultar estas entrevistas." }, 403) };
  const entrega = await supabase.from("submissions").select("id, user_id").eq("id", submissionId).eq("status", "submitted").maybeSingle();
  if (entrega.error) return { error: responder({ error: "No pudimos consultar la entrega." }, 500) };
  if (!entrega.data) return { error: responder({ error: "La entrega no está disponible." }, 404) };
  const evaluacion = await supabase.from("evaluations").select("evaluator_id").eq("submission_id", submissionId).maybeSingle();
  if (evaluacion.error) return { error: responder({ error: "No pudimos verificar la asignación." }, 500) };
  if (evaluacion.data && evaluacion.data.evaluator_id !== data.user.id && perfil.data.role !== "admin") return { error: responder({ error: "No tienes acceso a esta evaluación." }, 403) };
  return { supabase, usuario: data.user.id, nombre: perfil.data.display_name, entrega: entrega.data };
}

export async function GET(request: Request) {
  const submissionId = new URL(request.url).searchParams.get("submissionId");
  if (!uuid(submissionId)) return responder({ error: "Entrega inválida." }, 400);
  try {
    const acceso = await autorizar(submissionId);
    if (acceso.error) return acceso.error;
    const { supabase, usuario } = acceso;
    const resultado = await supabase.from("interview_reviews").select(columnas).eq("submission_id", submissionId).order("created_at", { ascending: false }).limit(101);
    if (resultado.error) return responder({ error: "No pudimos cargar las entrevistas asociadas. Reintenta." }, 500);
    const entrevistas = (resultado.data || []).slice(0, 100);
    if (!entrevistas.length) return responder({ interviews: [], limited: false, warnings: [] });
    const [perfiles, respuestas] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", [...new Set(entrevistas.map(fila => fila.reviewer_id))]),
      supabase.from("interview_review_responses").select("review_id, response, created_at").in("review_id", entrevistas.map(fila => fila.id)),
    ]);
    const nombres = new Map((perfiles.data || []).map(fila => [fila.id, fila.display_name]));
    const respuestasVisibles = new Map((respuestas.data || []).map(fila => [fila.review_id, fila]));
    return responder({ interviews: entrevistas.map(fila => ({ id: fila.id, status: fila.status, understanding_score: fila.understanding_score, adaptation_score: fila.adaptation_score, evidence: fila.evidence, created_at: fila.created_at, finalized_at: fila.finalized_at, own: fila.reviewer_id === usuario, reviewer_name: fila.reviewer_id === usuario ? acceso.nombre || null : nombres.get(fila.reviewer_id) || null, response: respuestasVisibles.get(fila.id)?.response || null })), limited: (resultado.data || []).length > 100, warnings: respuestas.error ? ["No pudimos consultar las respuestas visibles del candidato."] : [] });
  } catch { return responder({ error: "No pudimos conectar para cargar las entrevistas." }, 500); }
}

export async function POST(request: Request) {
  let cuerpo;
  try { cuerpo = await request.json(); } catch { return responder({ error: "Solicitud inválida." }, 400); }
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo) || !uuid(cuerpo.submissionId) || !["draft", "finalize"].includes(cuerpo.action)) return responder({ error: "Revisa la entrega y la acción." }, 400);
  const puntajeValido = (valor: unknown) => valor === null || (typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= 5);
  if (!puntajeValido(cuerpo.understandingScore) || !puntajeValido(cuerpo.adaptationScore) || typeof cuerpo.evidence !== "string" || cuerpo.evidence.length > 10000) return responder({ error: "Los puntajes deben estar entre 1 y 5 y la evidencia no puede superar 10 000 caracteres." }, 400);
  const evidencia = cuerpo.evidence.trim();
  if (cuerpo.action === "finalize" && (cuerpo.understandingScore === null || cuerpo.adaptationScore === null || evidencia.length < 20)) return responder({ error: "Completa ambos puntajes y escribe al menos 20 caracteres de evidencia para finalizar." }, 400);
  try {
    const acceso = await autorizar(cuerpo.submissionId);
    if (acceso.error) return acceso.error;
    const { supabase, usuario, entrega } = acceso;
    if (entrega.user_id === usuario) return responder({ error: "No puedes registrar tu propia entrevista." }, 403);
    const guardada = await supabase.from("interview_reviews").select(columnas).eq("submission_id", entrega.id).eq("reviewer_id", usuario).maybeSingle();
    if (guardada.error) return responder({ error: "No pudimos consultar tu entrevista." }, 500);
    if (guardada.data?.status === "finalized") return responder({ error: "Tu entrevista ya está finalizada y no se puede editar." }, 409);
    const valores = { understanding_score: cuerpo.understandingScore, adaptation_score: cuerpo.adaptationScore, evidence: evidencia };
    let actual = guardada.data;
    if (!actual) {
      const creada = await supabase.from("interview_reviews").insert({ ...valores, submission_id: entrega.id, candidate_id: entrega.user_id, reviewer_id: usuario, status: "draft" }).select(columnas).maybeSingle();
      if (creada.error || !creada.data) return responder({ error: "No pudimos crear el borrador. Revisa el historial antes de reintentar." }, creada.error?.code === "23505" ? 409 : 500);
      actual = creada.data;
      if (cuerpo.action === "draft") return responder({ interview: actual });
    }
    // Los participantes salen de la sesión y de la entrega, nunca del cuerpo recibido.
    // El UPDATE condicionado y el trigger existente impiden editar entrevistas finalizadas.
    let consulta = supabase.from("interview_reviews").update({ ...valores, status: cuerpo.action === "finalize" ? "finalized" : "draft" }).eq("id", actual.id).eq("reviewer_id", usuario).eq("status", "draft").eq("evidence", actual.evidence);
    consulta = actual.understanding_score === null ? consulta.is("understanding_score", null) : consulta.eq("understanding_score", actual.understanding_score);
    consulta = actual.adaptation_score === null ? consulta.is("adaptation_score", null) : consulta.eq("adaptation_score", actual.adaptation_score);
    const resultado = await consulta.select(columnas).maybeSingle();
    if (resultado.error) return responder({ error: "No pudimos guardar la entrevista. Comprueba el estado del historial antes de reintentar." }, 500);
    if (!resultado.data) return responder({ error: "La entrevista cambió o ya no es editable. Recarga el historial antes de continuar." }, 409);
    return responder({ interview: resultado.data });
  } catch { return responder({ error: "No pudimos confirmar el guardado. Tus observaciones siguen en el formulario." }, 500); }
}
