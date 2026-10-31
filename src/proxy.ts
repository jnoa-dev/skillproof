import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_RECORDARME, opcionesSesion } from "@/lib/supabase/sesion";

export async function proxy(request: NextRequest) {
  // Los pasaportes públicos no necesitan renovar ni heredar una sesión privada.
  if (request.nextUrl.pathname === "/passport" || request.nextUrl.pathname.startsWith("/passport/") || request.nextUrl.pathname.startsWith("/api/passport/")) {
    return NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...opcionesSesion(options, request.cookies.get(COOKIE_RECORDARME)?.value),
              secure: request.nextUrl.protocol === "https:",
            });
          });

          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    }
  );

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
