import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f-]{36}$/i;

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

  const reviewId = body.reviewId;
  const response =
    typeof body.response === "string" ? body.response.trim() : "";

  if (!uuidPattern.test(String(reviewId))) {
    return NextResponse.json({ error: "Evaluación inválida." }, { status: 400 });
  }

  if (response.length < 1 || response.length > 10000) {
    return NextResponse.json(
      { error: "La respuesta debe tener entre 1 y 10 000 caracteres." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const { data: review, error: reviewError } = await supabase
    .from("interview_reviews")
    .select("id, candidate_id, status")
    .eq("id", reviewId as string)
    .maybeSingle();

  if (reviewError) {
    return NextResponse.json(
      { error: "No se pudo consultar la evaluación." },
      { status: 500 }
    );
  }

  if (!review || review.candidate_id !== userId) {
    return NextResponse.json(
      { error: "No encontramos una evaluación tuya." },
      { status: 404 }
    );
  }

  if (review.status !== "finalized") {
    return NextResponse.json(
      { error: "Solo puedes responder evaluaciones finalizadas." },
      { status: 409 }
    );
  }

  const { data: saved, error: saveError } = await supabase
    .from("interview_review_responses")
    .upsert(
      {
        review_id: review.id,
        candidate_id: userId,
        response,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "review_id" }
    )
    .select("review_id, response, created_at, updated_at")
    .single();

  if (saveError || !saved) {
    return NextResponse.json(
      { error: "No se pudo guardar tu respuesta." },
      { status: 500 }
    );
  }

  return NextResponse.json({ response: saved });
}