import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { COOKIE_RECORDARME, DURACION_RECORDARME, opcionesSesion } from "./sesion";

export function guardarPreferenciaSesion(recordarme: boolean) {
  document.cookie = serializeCookieHeader(COOKIE_RECORDARME, recordarme ? "si" : "no", {
    path: "/",
    sameSite: "lax",
    secure: window.location.protocol === "https:",
    ...(recordarme ? { maxAge: DURACION_RECORDARME } : {}),
  });
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    typeof document === "undefined" ? undefined : {
      cookies: {
        getAll() {
          return parseCookieHeader(document.cookie);
        },
        setAll(cookiesToSet) {
          const preferencia = parseCookieHeader(document.cookie).find(({ name }) => name === COOKIE_RECORDARME)?.value;
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = serializeCookieHeader(name, value, {
              ...opcionesSesion(options, preferencia),
              secure: window.location.protocol === "https:",
            });
          });
        },
      },
    }
  );
}
