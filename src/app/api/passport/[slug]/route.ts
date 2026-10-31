import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      { error: "Pasaporte no encontrado." },
      { status: 404 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_passport", {
    p_slug: slug,
  });

  if (error) {
    return NextResponse.json(
      { error: "No se pudo cargar el pasaporte." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Pasaporte no encontrado o privado." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { passport: data },
    { headers: { "Cache-Control": "no-store" } }
  );
}