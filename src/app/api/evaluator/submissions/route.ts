import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function responder(datos: unknown, status = 200) {
  return NextResponse.json(datos, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function GET() {
  try {
  const supabase = await createClient();

  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return responder({ error: "Inicia sesión." }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return responder({ error: "No se pudo verificar el rol." }, 500);
  }

  if (profile?.role !== "evaluator" && profile?.role !== "admin") {
    return responder({ error: "No tienes permiso para ver las entregas." }, 403);
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select(
      "id, user_id, challenge_id, created_at, updated_at"
    )
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(101);

  if (submissionsError) {
    return responder({ error: "No se pudieron cargar las entregas." }, 500);
  }

  const filas = (submissions || []).slice(0, 100);
  if (!filas.length) return responder({ submissions: [], limited: false, warnings: [] });
  const ids = filas.map(fila => fila.id);
  const [perfiles, desafios, evaluaciones] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", [...new Set(filas.map(fila => fila.user_id))]),
    supabase.from("challenges").select("id, title").in("id", [...new Set(filas.map(fila => fila.challenge_id))]),
    supabase.from("evaluations").select("submission_id, evaluator_id, status, updated_at").in("submission_id", ids),
  ]);
  // Todas las consultas usan la sesión actual y sus políticas RLS. Una fila oculta
  // no demuestra ausencia de evaluación: la interfaz la llama "Sin evaluación visible".
  if (evaluaciones.error) return responder({ error: "No pudimos cargar los estados de evaluación. Reintenta para obtener indicadores fiables." }, 500);
  const nombres = new Map((perfiles.data || []).map(fila => [fila.id, fila.display_name]));
  const titulos = new Map((desafios.data || []).map(fila => [fila.id, fila.title]));
  const estados = new Map((evaluaciones.data || []).map(fila => [fila.submission_id, fila]));
  const warnings = [];
  if (perfiles.error) warnings.push("No pudimos cargar los nombres disponibles.");
  if (desafios.error) warnings.push("No pudimos cargar los títulos de los desafíos.");
  return responder({
    submissions: filas.map(fila => {
      const evaluacion = estados.get(fila.id);
      return {
        id: fila.id, challenge_id: fila.challenge_id,
        candidate_name: nombres.get(fila.user_id) || null,
        challenge_title: titulos.get(fila.challenge_id) || null,
        created_at: fila.created_at, updated_at: fila.updated_at,
        evaluation_status: evaluacion?.status === "draft" || evaluacion?.status === "finalized" ? evaluacion.status : null,
        evaluation_updated_at: evaluacion?.updated_at || null,
        own_evaluation: evaluacion?.evaluator_id === userId,
      };
    }),
    limited: (submissions || []).length > 100,
    warnings,
  });
  } catch {
    return responder({ error: "No pudimos conectar para cargar las entregas. Vuelve a intentarlo." }, 500);
  }
}