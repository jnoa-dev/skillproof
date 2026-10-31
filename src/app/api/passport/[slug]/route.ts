import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (slug.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      { error: "Pasaporte no encontrado." },
      { status: 404, headers }
    );
  }

  // La vista pública nunca hereda la sesión del visitante, ni siquiera si es administrador.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, opciones) => fetch(url, { ...opciones, cache: "no-store" }) } }
  );

  try {
  const { data, error } = await supabase.rpc("get_public_passport", {
    p_slug: slug,
  });

  if (error) {
    return NextResponse.json(
      { error: "No se pudo cargar el pasaporte." },
      { status: 500, headers }
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return NextResponse.json(
      { error: "Pasaporte no encontrado o privado." },
      { status: 404, headers }
    );
  }

  return NextResponse.json(
    { passport: data },
    { headers }
  );
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el pasaporte." }, { status: 503, headers });
  }
}
