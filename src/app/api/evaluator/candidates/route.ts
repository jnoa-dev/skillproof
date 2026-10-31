import { staffAccess } from "@/lib/evaluator/access";
import { reply } from "@/lib/defense/server";
import { uuid } from "@/lib/defense/model";
export async function GET(request: Request) {
  const candidateId = new URL(request.url).searchParams.get("candidateId");
  if (candidateId && !uuid(candidateId)) return reply({ error: "Candidato inválido." }, 400);
  try {
    const access = await staffAccess(); if (access.error) return access.error;
    let query = access.db.from("submissions").select("id, user_id, challenge_id, updated_at").eq("status", "submitted");
    if (candidateId) query = query.eq("user_id", candidateId);
    const submissions = await query.order("updated_at", { ascending: false }).order("id").limit(201);
    if (submissions.error) return reply({ error: "No pudimos cargar los candidatos." }, 500);
    const rows = (submissions.data || []).slice(0, 200);
    if (!rows.length) return reply({ candidates: [], limited: false, warnings: [] });
    const ids = rows.map(s => s.id);
    const [profiles, challenges, evaluations, interviews] = await Promise.all([
      access.db.from("profiles").select("id, display_name").in("id", [...new Set(rows.map(s => s.user_id))]),
      access.db.from("challenges").select("id, title").in("id", [...new Set(rows.map(s => s.challenge_id))]),
      access.db.from("evaluations").select("id, submission_id, status, total_score").in("submission_id", ids),
      access.db.from("interview_reviews").select("submission_id, status").in("submission_id", ids).order("created_at", { ascending: false }).limit(1001),
    ]);
    if (evaluations.error || interviews.error) return reply({ error: "No pudimos confirmar los estados de evaluación y entrevistas." }, 500);
    const evals = evaluations.data || [];
    const scores = candidateId && evals.length ? await access.db.from("evaluation_scores").select("evaluation_id, criterion_id, score, notes").in("evaluation_id", evals.map(e => e.id)) : { data: [], error: null };
    const criteria = scores.data?.length ? await access.db.from("rubric_criteria").select("id, title, max_score").in("id", [...new Set(scores.data.map(s => s.criterion_id))]) : { data: [], error: null };
    if (scores.error || criteria.error) return reply({ error: "No pudimos recuperar los resultados visibles." }, 500);
    const names = new Map((profiles.data || []).map(p => [p.id, p.display_name]));
    const titles = new Map((challenges.data || []).map(c => [c.id, c.title]));
    const evaluationsBySubmission = new Map(evals.map(e => [e.submission_id, e]));
    const criteriaById = new Map((criteria.data || []).map(c => [c.id, c]));
    return reply({ candidates: rows.map(row => {
      const evaluation = evaluationsBySubmission.get(row.id);
      const visibleInterviews = (interviews.data || []).slice(0, 1000).filter(i => i.submission_id === row.id);
      return { submission_id: row.id, candidate_id: row.user_id, name: names.get(row.user_id) || null, challenge_id: row.challenge_id, challenge_title: titles.get(row.challenge_id) || null, updated_at: row.updated_at, evaluation_status: evaluation?.status || null, total_score: evaluation?.status === "finalized" && evaluation.total_score !== null ? Number(evaluation.total_score) : null, interview_status: visibleInterviews.some(i => i.status === "finalized") ? "finalized" : visibleInterviews.length ? "draft" : null, scores: evaluation?.status === "finalized" ? (scores.data || []).filter(s => s.evaluation_id === evaluation.id).map(s => ({ title: criteriaById.get(s.criterion_id)?.title || "Criterio no disponible", score: Number(s.score), max_score: criteriaById.get(s.criterion_id)?.max_score !== undefined ? Number(criteriaById.get(s.criterion_id)?.max_score) : null, notes: s.notes })) : [] };
    }), limited: (submissions.data || []).length > 200, warnings: [...(profiles.error ? ["No pudimos cargar los nombres disponibles."] : []), ...(challenges.error ? ["No pudimos cargar los títulos disponibles."] : []), ...((interviews.data || []).length > 1000 ? ["Los estados de entrevista se limitan a los 1000 registros visibles más recientes."] : [])] });
  } catch { return reply({ error: "No pudimos conectar para consultar los candidatos." }, 500); }
}
