import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_RECORDARME, opcionesSesion } from "./sesion";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...opcionesSesion(options, cookieStore.get(COOKIE_RECORDARME)?.value),
                secure: process.env.NODE_ENV === "production",
              });
            });
          } catch {
            // El proxy refresca la sesión cuando un Server Component no puede escribir cookies.
          }
        },
      },
    }
  );
}
