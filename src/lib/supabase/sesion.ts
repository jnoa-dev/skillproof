import type { CookieOptions } from "@supabase/ssr";

export const COOKIE_RECORDARME = "skillproof-recordarme";
export const DURACION_RECORDARME = 30 * 24 * 60 * 60;

export function opcionesSesion(
  opciones: CookieOptions,
  preferencia: string | undefined,
): CookieOptions {
  // Las eliminaciones siempre conservan su caducidad inmediata.
  if ((opciones.maxAge !== undefined && opciones.maxAge <= 0) || (opciones.expires && opciones.expires.getTime() <= Date.now())) {
    return opciones;
  }

  if (preferencia !== "si" && preferencia !== "no") return opciones;

  const resultado = { ...opciones };
  delete resultado.expires;

  if (preferencia === "si") {
    resultado.maxAge = DURACION_RECORDARME;
  } else {
    delete resultado.maxAge;
  }

  return resultado;
}
