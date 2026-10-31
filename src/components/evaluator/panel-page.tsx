
import { LoadingState } from "@/components/ui/loading-state";
import Link from "next/link";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardEvaluador from "@/components/evaluator/dashboard";
import { AccesoEvaluador } from "@/components/evaluator/states";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export function CargaPaginaEvaluador({ vista = "inicio" }: { vista?: "inicio" | "entregas" }) { return <LoadingState fullPage label={vista === "entregas" ? "Cargando entregas por evaluar…" : "Cargando panel del evaluador…"}/>; }

export default async function PanelEvaluador({ vista = "inicio" }: { vista?: "inicio" | "entregas" }) {
  await connection();
  const supabase = await createClient();
  const { data: auth, error: errorAuth } = await supabase.auth.getClaims();
  const usuario = auth?.claims?.sub;
  if (errorAuth) return <div className={inter.className}><AccesoEvaluador error/></div>;
  if (typeof usuario !== "string") redirect("/login");
  const { data: perfil, error } = await supabase.from("profiles").select("display_name, role").eq("id", usuario).maybeSingle();
  if (error || !perfil) return <div className={inter.className}><AccesoEvaluador error/></div>;
  if (perfil.role !== "evaluator" && perfil.role !== "admin") return <div className={inter.className}><AccesoEvaluador rol={perfil.role}/></div>;
  const nombre = perfil.display_name?.trim() || "Evaluador";
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((parte: string) => parte[0]).join("").toUpperCase();
  const saludo = nombre.replace(/^(dra?\.?|lic\.?|ing\.?)\s+/i, "").split(/\s+/)[0];
  const rol = perfil.role === "admin" ? "Administrador" : "Evaluador";
  return <div className={`${inter.className} flex min-h-screen flex-col bg-[#f7f9fc] text-[#14263d]`}>
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 sm:px-8">
      <div className="flex min-h-16 flex-wrap items-center gap-8"><Link href="/evaluator" className="text-2xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-blue-700">SKILLPROOF</Link><nav aria-label="Navegación del evaluador" className="flex min-h-16 items-stretch gap-6 text-sm font-medium"><Link href="/evaluator" aria-current={vista === "inicio" ? "page" : undefined} className={`flex items-center border-b-2 ${vista === "inicio" ? "border-blue-600 text-blue-700" : "border-transparent hover:text-blue-700"}`}>Inicio</Link><Link href="/evaluator/submissions" aria-current={vista === "entregas" ? "page" : undefined} className={`flex items-center border-b-2 ${vista === "entregas" ? "border-blue-600 text-blue-700" : "border-transparent hover:text-blue-700"}`}>Entregas por evaluar</Link><Link href="/evaluator/candidates" className="flex items-center border-b-2 border-transparent hover:text-blue-700">Candidatos</Link>{perfil.role === "admin" && <Link href="/evaluator/challenges" className="flex items-center border-b-2 border-transparent hover:text-blue-700">Desafíos</Link>}<Link href="/evaluator/interviews" className="flex items-center border-b-2 border-transparent hover:text-blue-700">Entrevistas</Link></nav></div>
      <Link href="/account" aria-label="Mi cuenta" className="flex items-center gap-3 rounded-lg py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{iniciales}</span><span className="hidden text-sm sm:block"><span className="block font-semibold">{nombre}</span><span className="block text-xs text-[#536174]">{rol}</span></span><span aria-hidden="true" className="ml-2 flex size-8 items-center justify-center rounded-full bg-blue-800 text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3Z"/></svg></span></Link>
    </div></header>
    <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-8 px-6 py-8 sm:px-8"><div><h1 className="text-[32px] leading-10 font-bold tracking-tight">{vista === "inicio" ? `Hola, ${saludo}` : "Entregas por evaluar"}</h1><p className="mt-2 text-base text-[#536174]">{vista === "inicio" ? "Estas son las entregas disponibles para evaluar." : "Selecciona una entrega enviada para consultar la evidencia y su rúbrica."}</p></div><DashboardEvaluador soloEntregas={vista === "entregas"}/></main>
    <footer className="border-t border-slate-200 bg-white px-6 py-6 text-xs text-[#536174]"><div className="mx-auto flex max-w-[1200px] justify-between gap-3 sm:px-2"><span>© SKILLPROOF</span><div className="flex gap-3"><button type="button" disabled title="Términos aún no está disponible">Términos</button><span>·</span><button type="button" disabled title="Soporte aún no está disponible">Soporte</button></div></div></footer>
  </div>;
}
