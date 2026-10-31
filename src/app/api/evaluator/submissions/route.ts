import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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
      { error: "No tienes permiso para ver las entregas." },
      { status: 403 }
    );
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select(
      "id, user_id, challenge_id, status, github_repo_url, documentation, justification, problem_description, created_at, updated_at"
    )
    .eq("status", "submitted")
    .order("created_at", { ascending: true })
    .limit(100);

  if (submissionsError) {
    return NextResponse.json(
      { error: "No se pudieron cargar las entregas." },
      { status: 500 }
    );
  }

  return NextResponse.json({ submissions });
}