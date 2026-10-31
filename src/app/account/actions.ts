"use server";

import { createClient } from "@/lib/supabase/server";

export async function guardarNombre(nombre: string) {
  if (typeof nombre !== "string" || !nombre.trim() || nombre.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(nombre)) {
    return { error: "Ingresa un nombre de entre 1 y 120 caracteres." };
  }
  try {
    const supabase = await createClient();
    const { data, error: errorUsuario } = await supabase.auth.getUser();
    if (errorUsuario || !data.user) return { error: "Tu sesión caducó. Vuelve a iniciar sesión." };
    // El identificador siempre procede de la sesión y solo se modifica display_name.
    // Se conservan las políticas RLS y nunca se usan credenciales de administración.
    const { data: perfil, error } = await supabase.from("profiles")
      .update({ display_name: nombre.trim() }).eq("id", data.user.id)
      .select("display_name").maybeSingle();
    if (error || !perfil || perfil.display_name !== nombre.trim()) {
      return { error: "No pudimos guardar tu nombre. Reintenta; si persiste, el administrador debe revisar los permisos del perfil." };
    }
    return { nombre: perfil.display_name as string };
  } catch {
    return { error: "No pudimos conectar. Tus cambios siguen disponibles para reintentar." };
  }
}
