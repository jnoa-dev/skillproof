import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f-]{36}$/i;
const reviewFields =
  "id, submission_id, candidate_id, status, understanding_score, adaptation_score, evidence, created_at, finalized_at";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const url = new URL(request.url);
  const submissionId = url.searchParams.get("submissionId");
  const candidateId = url.searchParams.get("candidateId") ?? userId;

  if (
    (submissionId && !uuidPattern.test(submissionId)) ||
    !uuidPattern.test(candidateId)
  ) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let query = supabase
    .from("interview_reviews")
    .select(reviewFields)
    .order("created_at", { ascending: false });

  query = submissionId
    ? query.eq("submission_id", submissionId)
    : query.eq("candidate_id", candidateId);

  const { data: reviews, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "No se pudo cargar el historial." },
      { status: 500 }
    );
  }

  const reviewIds = (reviews ?? []).map((review) => review.id);
  let responses: {
    review_id: string;
    response: string;
    created_at: string;
  }[] = [];

  if (reviewIds.length > 0) {
    const { data, error: responseError } = await supabase
      .from("interview_review_responses")
      .select("review_id, response, created_at")
      .in("review_id", reviewIds);

    if (responseError) {
      return NextResponse.json(
        { error: "No se pudieron cargar las respuestas." },
        { status: 500 }
      );
    }

    responses = data ?? [];
  }

  const responseByReviewId = new Map(
    responses.map((response) => [response.review_id, response])
  );

  return NextResponse.json({
    reviews: (reviews ?? []).map((review) => ({
      ...review,
      candidate_response: responseByReviewId.get(review.id) ?? null,
    })),
  });
}

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

  const submissionId = body.submissionId;
  const action = body.action;
  const understandingScore = body.understandingScore;
  const adaptationScore = body.adaptationScore;
  const evidence = typeof body.evidence === "string" ? body.evidence.trim() : "";

  if (!uuidPattern.test(String(submissionId))) {
    return NextResponse.json({ error: "Entrega inválida." }, { status: 400 });
  }

  if (
    (action !== "draft" && action !== "finalize") ||
    !Number.isInteger(understandingScore) ||
    Number(understandingScore) < 1 ||
    Number(understandingScore) > 5 ||
    !Number.isInteger(adaptationScore) ||
    Number(adaptationScore) < 1 ||
    Number(adaptationScore) > 5 ||
    evidence.length > 10000 ||
    (action === "finalize" && evidence.length < 20)
  ) {
    return NextResponse.json(
      { error: "Completa puntajes válidos y evidencia antes de finalizar." },
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

  if (!["recruiter", "evaluator", "admin"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "No tienes permiso." }, { status: 403 });
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, user_id")
    .eq("id", submissionId as string)
    .eq("status", "submitted")
    .maybeSingle();

  if (submissionError || !submission) {
    return NextResponse.json(
      { error: "No encontramos una entrega enviada." },
      { status: 404 }
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("interview_reviews")
    .select("id, status")
    .eq("submission_id", submission.id)
    .eq("reviewer_id", userId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: "No se pudo consultar la evaluación." },
      { status: 500 }
    );
  }

  if (existing?.status === "finalized") {
    return NextResponse.json(
      { error: "Esta evaluación ya fue finalizada." },
      { status: 409 }
    );
  }

  const reviewData = {
    submission_id: submission.id,
    candidate_id: submission.user_id,
    reviewer_id: userId,
    status: "draft",
    understanding_score: understandingScore,
    adaptation_score: adaptationScore,
    evidence,
  };

  let reviewId = existing?.id;

  if (reviewId) {
    const { error } = await supabase
      .from("interview_reviews")
      .update(reviewData)
      .eq("id", reviewId);

    if (error) {
      return NextResponse.json(
        { error: "No se pudo guardar el borrador." },
        { status: 500 }
      );
    }
  } else {
    const { data: created, error } = await supabase
      .from("interview_reviews")
      .insert(reviewData)
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: "No se pudo crear la evaluación." },
        { status: error?.code === "23505" ? 409 : 500 }
      );
    }

    reviewId = created.id;
  }

  if (action === "finalize") {
    const { data: finalized, error } = await supabase
      .from("interview_reviews")
      .update({ status: "finalized" })
      .eq("id", reviewId)
      .select(reviewFields)
      .single();

    if (error || !finalized) {
      return NextResponse.json(
        { error: "No se pudo finalizar la evaluación." },
        { status: 400 }
      );
    }

    return NextResponse.json({ review: finalized });
  }

  return NextResponse.json({ reviewId, status: "draft" });
}