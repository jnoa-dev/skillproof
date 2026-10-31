import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";
import { dashboardForRole } from "./dashboard";
import { reply } from "@/lib/defense/server";
type Database = Awaited<ReturnType<typeof createClient>>;
export async function requireStudentPage(db: Database, userId: string) {
  const profile = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile.error || profile.data?.role !== "student") redirect(dashboardForRole(profile.data?.role) || "/dashboard");
}
export async function studentActionError(db: Database, userId: string) {
  const profile = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile.error) return reply({ error: "No pudimos verificar tu rol." }, 500);
  if (profile.data?.role !== "student") return reply({ error: "Esta acción corresponde únicamente a estudiantes." }, 403);
  return null;
}
