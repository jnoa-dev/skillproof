import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {

  
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

  const hasSlug = "public_slug" in body;
  const hasHistorySharing = "recruiter_history_shared" in body;
  const hasVisibility = "passport_public" in body;

  if (!hasSlug && !hasVisibility && !hasHistorySharing) {
      return NextResponse.json(
      { error: "Indica el slug o el estado de publicación." },
      { status: 400 }
    );
  }

  if (
    hasHistorySharing &&
    typeof body.recruiter_history_shared !== "boolean"
  ) {
    return NextResponse.json(
      { error: "El consentimiento debe ser verdadero o falso." },
      { status: 400 }
    );
  }

  if (
    hasSlug &&
    body.public_slug !== null &&
    typeof body.public_slug !== "string"
  ) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
  }

  if (hasVisibility && typeof body.passport_public !== "boolean") {
    return NextResponse.json(
      { error: "El estado de publicación debe ser verdadero o falso." },
      { status: 400 }
    );
  }

  const requestedSlug =
    typeof body.public_slug === "string"
      ? body.public_slug.trim().toLowerCase()
      : null;

  if (
    requestedSlug &&
    (requestedSlug.length > 30 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedSlug))
  ) {
    return NextResponse.json(
      { error: "Usa de 3 a 30 caracteres: letras, números y guiones." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("role, public_slug, passport_public, recruiter_history_shared")
    .eq("id", userId)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json(
      { error: "No se pudo cargar tu configuración." },
      { status: 500 }
    );
  }

  if (!current) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }
  if (current.role !== "student") return NextResponse.json({ error: "La configuración del pasaporte corresponde al estudiante." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });

  const nextSlug = hasSlug
    ? requestedSlug || null
    : current.public_slug;

  const nextVisibility = hasVisibility
    ? (body.passport_public as boolean)
    : current.passport_public;

  if (nextVisibility && !nextSlug) {
    return NextResponse.json(
      { error: "Configura un slug antes de publicar el pasaporte." },
      { status: 400 }
    );
  }

  const updates: {
    public_slug?: string | null;
    passport_public?: boolean;
    recruiter_history_shared?: boolean;
  } = {};

  if (hasSlug) updates.public_slug = nextSlug;
  if (hasVisibility) updates.passport_public = nextVisibility;
  if (hasHistorySharing) {
    updates.recruiter_history_shared =
      body.recruiter_history_shared as boolean;
  }
  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("public_slug, passport_public, recruiter_history_shared")
    .single();

  if (updateError?.code === "23505") {
    return NextResponse.json(
      { error: "Ese slug ya está ocupado. Prueba otro." },
      { status: 409 }
    );
  }

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "No se pudo guardar la configuración." },
      { status: 500 }
    );
  }

  return NextResponse.json({ passport: updated });
}

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, public_slug, passport_public, recruiter_history_shared")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo cargar la configuración." },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }
  if (profile.role !== "student") return NextResponse.json({ error: "La configuración del pasaporte corresponde al estudiante." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });

  return NextResponse.json(
    { passport: { public_slug: profile.public_slug, passport_public: profile.passport_public, recruiter_history_shared: profile.recruiter_history_shared } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
