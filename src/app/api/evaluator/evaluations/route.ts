import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ScoreInput = {
  criterionId: string;
  score: number;
  notes: string;
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    const parsed: unknown = await request.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const action = body.action;
  const submissionId = body.submissionId;
  const summary =
    typeof body.summary === "string" ? body.summary.trim() : "";
  const rawScores = body.scores;

  if (action !== "draft" && action !== "finalize") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  if (!isUuid(submissionId)) {
    return NextResponse.json({ error: "Entrega inválida." }, { status: 400 });
  }

  if (summary.length > 10000 || !Array.isArray(rawScores) || rawScores.length > 50) {
    return NextResponse.json(
      { error: "Revisa el resumen y los puntajes enviados." },
      { status: 400 }
    );
  }

  const scores: ScoreInput[] = [];

  for (const item of rawScores) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return NextResponse.json({ error: "Puntaje inválido." }, { status: 400 });
    }

    const scoreItem = item as Record<string, unknown>;
    const criterionId = scoreItem.criterionId;
    const score = scoreItem.score;
    const notes = typeof scoreItem.notes === "string" ? scoreItem.notes.trim() : "";

    if (
      !isUuid(criterionId) ||
      typeof score !== "number" ||
      !Number.isFinite(score) ||
      score < 0 ||
      notes.length > 5000
    ) {
      return NextResponse.json({ error: "Puntaje inválido." }, { status: 400 });
    }

    scores.push({ criterionId, score, notes });
  }

  if (new Set(scores.map((item) => item.criterionId)).size !== scores.length) {
    return NextResponse.json(
      { error: "Hay criterios repetidos en los puntajes." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: "No se pudo verificar el rol." },
      { status: 500 }
    );
  }

  if (profile?.role !== "evaluator" && profile?.role !== "admin") {
    return NextResponse.json(
      { error: "No tienes permiso para evaluar." },
      { status: 403 }
    );
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, challenge_id")
    .eq("id", submissionId)
    .eq("status", "submitted")
    .maybeSingle();

  if (submissionError) {
    return NextResponse.json(
      { error: "No se pudo consultar la entrega." },
      { status: 500 }
    );
  }

  if (!submission) {
    return NextResponse.json(
      { error: "No encontramos una entrega enviada." },
      { status: 404 }
    );
  }

  const { data: criteria, error: criteriaError } = await supabase
    .from("rubric_criteria")
    .select("id, max_score")
    .eq("challenge_id", submission.challenge_id)
    .eq("is_active", true);

  if (criteriaError || !criteria?.length) {
    return NextResponse.json(
      { error: "No se pudo cargar la rúbrica del desafío." },
      { status: 500 }
    );
  }

  const criteriaById = new Map(criteria.map((criterion) => [criterion.id, criterion]));

  for (const item of scores) {
    const criterion = criteriaById.get(item.criterionId);

    if (!criterion || item.score > Number(criterion.max_score)) {
      return NextResponse.json(
        { error: "Un puntaje no corresponde a la rúbrica o supera su máximo." },
        { status: 400 }
      );
    }
  }

  if (
    action === "finalize" &&
    (scores.length !== criteria.length ||
      criteria.some((criterion) => !scores.some((item) => item.criterionId === criterion.id)))
  ) {
    return NextResponse.json(
      { error: "Completa todos los criterios antes de finalizar." },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("evaluations")
    .select("id, evaluator_id, status")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: "No se pudo consultar la evaluación." },
      { status: 500 }
    );
  }

  if (existing?.evaluator_id && existing.evaluator_id !== userId) {
    return NextResponse.json(
      { error: "Esta entrega ya está asignada a otro evaluador." },
      { status: 409 }
    );
  }

  if (existing?.status === "finalized") {
    return NextResponse.json(
      { error: "Esta evaluación ya fue finalizada." },
      { status: 409 }
    );
  }

  let evaluationId = existing?.id;

  if (!evaluationId) {
    const { data: created, error: createError } = await supabase
      .from("evaluations")
      .insert({
        submission_id: submissionId,
        evaluator_id: userId,
        status: "draft",
      })
      .select("id")
      .single();

    if (createError || !created) {
      return NextResponse.json(
        { error: "No se pudo iniciar la evaluación." },
        { status: createError?.code === "23505" ? 409 : 500 }
      );
    }

    evaluationId = created.id;
  }

  const { error: summaryError } = await supabase
    .from("evaluations")
    .update({ summary })
    .eq("id", evaluationId);

  if (summaryError) {
    return NextResponse.json(
      { error: "No se pudo guardar el resumen." },
      { status: 500 }
    );
  }

  if (scores.length > 0) {
    const rows = scores.map((item) => ({
      evaluation_id: evaluationId,
      criterion_id: item.criterionId,
      score: item.score,
      notes: item.notes,
    }));

    const { error: scoresError } = await supabase
      .from("evaluation_scores")
      .upsert(rows, { onConflict: "evaluation_id,criterion_id" });

    if (scoresError) {
      return NextResponse.json(
        { error: "No se pudieron guardar los puntajes." },
        { status: 500 }
      );
    }
  }

  if (action === "finalize") {
    const { data: finalized, error: finalizeError } = await supabase
      .from("evaluations")
      .update({ status: "finalized" })
      .eq("id", evaluationId)
      .select("id, status, total_score, finalized_at")
      .single();

    if (finalizeError || !finalized) {
      return NextResponse.json(
        { error: "No se pudo finalizar. Revisa que todos los criterios estén puntuados." },
        { status: 400 }
      );
    }

    return NextResponse.json({ evaluation: finalized });
  }

  return NextResponse.json({
    evaluation: { id: evaluationId, status: "draft" },
  });
}

export async function GET(request: Request) {
  const submissionId = new URL(request.url).searchParams.get("submissionId");

  if (!isUuid(submissionId)) {
    return NextResponse.json({ error: "Entrega inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: "No se pudo verificar el rol." },
      { status: 500 }
    );
  }

  if (profile?.role !== "evaluator" && profile?.role !== "admin") {
    return NextResponse.json(
      { error: "No tienes permiso para ver esta evaluación." },
      { status: 403 }
    );
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, challenge_id, status")
    .eq("id", submissionId)
    .eq("status", "submitted")
    .maybeSingle();

  if (submissionError) {
    return NextResponse.json(
      { error: "No se pudo consultar la entrega." },
      { status: 500 }
    );
  }

  if (!submission) {
    return NextResponse.json(
      { error: "No encontramos una entrega enviada." },
      { status: 404 }
    );
  }

  const { data: criteria, error: criteriaError } = await supabase
    .from("rubric_criteria")
    .select("id, criterion_key, title, description, max_score, weight, position")
    .eq("challenge_id", submission.challenge_id)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (criteriaError) {
    return NextResponse.json(
      { error: "No se pudo cargar la rúbrica." },
      { status: 500 }
    );
  }

  const { data: evaluation, error: evaluationError } = await supabase
    .from("evaluations")
    .select("id, evaluator_id, status, summary, total_score, finalized_at")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (evaluationError) {
    return NextResponse.json(
      { error: "No se pudo cargar el borrador de evaluación." },
      { status: 500 }
    );
  }

  let scores: {
    criterion_id: string;
    score: number;
    notes: string;
  }[] = [];

  if (evaluation) {
    if (evaluation.evaluator_id !== userId && profile.role !== "admin") {
      return NextResponse.json(
        { error: "Esta evaluación está asignada a otro evaluador." },
        { status: 403 }
      );
    }

    const { data: savedScores, error: scoresError } = await supabase
      .from("evaluation_scores")
      .select("criterion_id, score, notes")
      .eq("evaluation_id", evaluation.id);

    if (scoresError) {
      return NextResponse.json(
        { error: "No se pudieron cargar los puntajes." },
        { status: 500 }
      );
    }

    scores = savedScores ?? [];
  }

  return NextResponse.json({ submission, criteria, evaluation, scores });
}