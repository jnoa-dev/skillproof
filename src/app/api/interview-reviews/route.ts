import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentActionError } from "@/lib/auth/student";

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

  const roleError = await studentActionError(supabase, userId);
  if (roleError) return roleError;
  if (candidateId !== userId) return NextResponse.json({ error: "Solo puedes consultar tu propio historial de estudiante." }, { status: 403 });

  let query = supabase
    .from("interview_reviews")
    .select(reviewFields)
    .eq("candidate_id", userId)
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

// La ruta antigua usa el mismo guardado y los mismos permisos que el panel actual.
export { POST } from "../evaluator/interviews/route";
