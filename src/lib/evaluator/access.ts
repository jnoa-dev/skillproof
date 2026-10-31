import { createClient } from "@/lib/supabase/server";
import { reply } from "@/lib/defense/server";
export async function staffAccess(adminOnly = false) {
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { error: reply({ error: "Inicia sesión nuevamente." }, 401) };
  const profile = await db.from("profiles").select("role, display_name").eq("id", data.user.id).maybeSingle();
  if (profile.error) return { error: reply({ error: "No pudimos verificar tu acceso." }, 500) };
  if (!profile.data || !(adminOnly ? ["admin"] : ["admin", "evaluator"]).includes(profile.data.role)) return { error: reply({ error: adminOnly ? "La gestión de desafíos requiere una cuenta administradora." : "No tienes permiso para consultar candidatos." }, 403) };
  return { db, user: data.user.id, profile: profile.data };
}
