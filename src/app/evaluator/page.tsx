import { Suspense } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListaEntregas } from "@/components/evaluator/evaluation-panel";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function EvaluatorPage() {
  return <Suspense fallback={<main role="status" aria-busy="true" className="min-h-screen bg-[#f8f9ff] p-8"><div aria-hidden="true" className="carga-animada mx-auto max-w-4xl space-y-6">{[0, 1, 2].map(indice => <div key={indice} className="h-24 rounded-xl bg-slate-200"/>)}</div><span className="sr-only">Cargando entregas...</span></main>}><EntregasDisponibles/></Suspense>;
}

async function EntregasDisponibles() {
  await connection();
  const supabase = await createClient();
  const { data: auth, error: errorAuth } = await supabase.auth.getClaims();
  const usuario = auth?.claims?.sub;
  if (errorAuth || typeof usuario !== "string") redirect("/login");
  const { data: perfil, error } = await supabase.from("profiles").select("display_name, role").eq("id", usuario).maybeSingle();
  if (error || (perfil?.role !== "evaluator" && perfil?.role !== "admin")) {
    return <main className={`${inter.className} flex min-h-screen items-center justify-center bg-[#f8f9ff] px-6 py-12 text-[#14263d]`}><section aria-labelledby="titulo-acceso-evaluador" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg></div><h1 id="titulo-acceso-evaluador" className="mt-5 text-xl font-semibold leading-7">{error ? "No pudimos verificar tu acceso" : "No tienes permiso para acceder al panel del evaluador"}</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">{error ? "Vuelve a intentarlo más tarde o regresa a tu dashboard." : "Este apartado está disponible para cuentas con rol de evaluador o administrador."}</p><Link href="/dashboard" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#165dcc] px-5 text-sm font-semibold text-white transition-[scale,box-shadow] duration-150 hover:shadow-md motion-safe:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><span aria-hidden="true">←</span>Volver al dashboard</Link></section></main>;
  }
  return <div className={`${inter.className} flex min-h-screen flex-col bg-[#f8f9ff] text-[#14263d]`}><header className="border-b border-slate-200 bg-white px-6"><div className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center justify-between gap-4"><span className="text-xl font-semibold">SKILLPROOF</span><Link href="/account" aria-label="Mi cuenta" className="rounded-lg py-3 text-sm hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700">{perfil.display_name || "Evaluador"}</Link></div></header><main className="mx-auto w-full max-w-[1200px] flex-1 space-y-6 px-6 py-8"><h1 className="text-3xl font-bold">Entregas disponibles</h1><p className="text-sm text-slate-600">Selecciona una entrega enviada para consultar la evidencia y su rúbrica. Las evaluaciones de otra persona conservan sus restricciones de acceso.</p><ListaEntregas/></main><footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500"><div className="mx-auto flex max-w-[1200px] justify-between gap-3"><span>© {new Date().getFullYear()} SKILLPROOF</span><div className="flex gap-2"><button type="button" disabled title="Términos aún no está disponible">Términos</button><span>·</span><button type="button" disabled title="Soporte aún no está disponible">Soporte</button></div></div></footer></div>;
}
