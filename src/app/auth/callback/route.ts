import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");
  // Destinos fijos: nunca se acepta una URL de redirección proporcionada por el usuario.
  const respuestaError = () => {
    const respuesta = NextResponse.redirect(new URL("/login?error=enlace", request.url));
    respuesta.headers.set("Cache-Control", "private, no-store");
    respuesta.headers.set("Referrer-Policy", "no-referrer");
    return respuesta;
  };

  if (!codigo || request.nextUrl.searchParams.has("error")) return respuestaError();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);

    if (error || !data.session) return respuestaError();

    let destino: string;

    if (request.nextUrl.searchParams.get("flujo") === "recuperacion") {
      destino = "/login?estado=restablecer";
    } else {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) return respuestaError();

      destino = profile.role === "recruiter" ? "/recruiter" : "/dashboard";
    }

    const respuesta = NextResponse.redirect(new URL(destino, request.url));
    respuesta.headers.set("Cache-Control", "private, no-store");
    respuesta.headers.set("Referrer-Policy", "no-referrer");
    return respuesta;
  } catch {
    return respuestaError();
  }
}
