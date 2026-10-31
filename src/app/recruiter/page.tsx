
import { LoadingState } from "@/components/ui/loading-state";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardForRole } from "@/lib/auth/dashboard";

export default function RecruiterPage() { return <Suspense fallback={<LoadingState fullPage label="Cargando panel…"/>}><Panel/></Suspense>; }
async function Panel() {
  await connection();
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: profile, error } = await db.from("profiles").select("role, display_name").eq("id", data.user.id).maybeSingle();
  const home = dashboardForRole(profile?.role);
  if (!error && home && home !== "/recruiter") redirect(home);
  return <div className="min-h-screen bg-[#f7f9fc] text-[#14263d]"><header className="border-b border-slate-200 bg-white px-8 py-5"><div className="mx-auto flex max-w-[1200px] justify-between"><Link href="/recruiter" className="font-bold">SKILLPROOF</Link><Link href="/account" className="text-sm text-blue-700">Mi cuenta</Link></div></header><main className="mx-auto max-w-[1200px] px-8 py-10"><p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Panel del reclutador</p><h1 className="mt-3 text-3xl font-bold">Hola, {profile?.display_name?.split(/\s+/)[0] || "bienvenido"}</h1><section className="mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm"><h2 className="text-xl font-semibold">{error || !home ? "No pudimos verificar tu acceso" : "Herramientas de reclutamiento pendientes de habilitar"}</h2><p className="mt-3 text-sm leading-6 text-slate-600">La gestión de desafíos y candidatos requiere definir los permisos y la propiedad de los datos del reclutador. Este acceso no concede permisos de evaluación automáticamente.</p><Link href="/account" className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Ir a mi cuenta</Link></section></main></div>;
}
