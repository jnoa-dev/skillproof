import Link from "next/link";
import { Inter } from "next/font/google";
import type { DefenseData } from "@/lib/defense/types";
import "./defense.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const card = "rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6";
export const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#165dcc] px-5 py-3 text-sm font-semibold text-white hover:bg-[#124ead] disabled:bg-[#e5e7eb] disabled:text-[#6b7280]";
export const secondary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-semibold text-[#14263d] hover:bg-[#eff3ff] disabled:text-[#6b7280]";
export const field = "mt-2 w-full rounded-lg border border-[#cbd5e1] bg-white p-3 text-base text-[#17212f]";
export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded border border-[#bacfef] bg-[#ebf3fc] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#165dcc]">{children}</span>;
}
export function LocalNotice() {
  return <aside role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-[#985b00]"><strong>Previsualización local.</strong> No inicia una defensa real. No guarda ni envía respuestas, no emite constancias y no genera calificaciones. El contenido local se pierde al salir o recargar.</aside>;
}
export function DefenseShell({ data, title, children, evaluator = false }: {
  data: DefenseData; title: string; children: React.ReactNode; evaluator?: boolean;
}) {
  const base = "/challenges/" + encodeURIComponent(data.slug);
  return <div className={inter.className + " defense-ui flex min-h-screen flex-col"}>
    <header className="border-b border-[#e2e8f0] bg-white"><div className="mx-auto flex min-h-18 max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
      <div className="flex flex-wrap items-center gap-8"><Link href={evaluator ? "/evaluator" : "/dashboard"} className="text-xl font-bold tracking-tight text-[#14263d]"><span aria-hidden="true" className="mr-2 text-[#165dcc]">▣</span>SKILLPROOF</Link>
      <nav aria-label="Navegación principal" className="flex gap-5 text-sm"><Link href={evaluator ? "/evaluator" : "/dashboard"}>{evaluator ? "Entregas disponibles" : "Mis desafíos"}</Link>{!evaluator && <Link href="/passport">Mi pasaporte</Link>}</nav></div>
      <Link href="/account" className="text-right text-sm font-semibold">{data.name}<span className="block text-xs font-normal text-[#536174]">{data.role === "admin" ? "Administrador" : evaluator ? "Evaluador" : "Mi cuenta"}</span></Link>
    </div></header>
    <main className="mx-auto w-full max-w-[1280px] flex-1 space-y-6 px-4 py-8 sm:px-8">
      <nav aria-label="Ruta de navegación" className="flex flex-wrap gap-2 text-xs text-[#536174]"><Link href={evaluator ? "/evaluator" : "/dashboard"}>{evaluator ? "Evaluador" : "Mis desafíos"}</Link><span>/</span><Link href={base}>{data.title}</Link><span>/</span><span aria-current="page">Defensa técnica</span></nav>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[28px] leading-9 font-bold tracking-tight text-[#14263d] sm:text-[32px] sm:leading-10">{title}</h1><p className="mt-2 text-sm text-[#536174]">{data.title}</p></div><Badge>Interfaces · Etapa 1</Badge></div>
      <LocalNotice />{children}
    </main><footer className="border-t border-[#e2e8f0] bg-white px-4 py-5 text-xs text-[#536174]"><div className="mx-auto max-w-[1216px]">© SKILLPROOF · Verificación Técnica Universitaria</div></footer>
  </div>;
}
export function DefenseUnavailable({ message, href = "/dashboard", inline = false }: { message: string; href?: string; inline?: boolean }) {
  return <div className={inline ? "" : "min-h-screen bg-[#f7f9fc] px-6 py-16 text-[#14263d]"}><section role="alert" className={card + " mx-auto max-w-xl"}><h1 className="text-xl font-bold">Defensa técnica no disponible</h1><p className="my-4">{message}</p><a href={href} className={secondary}>Reintentar</a><Link href="/dashboard" className={secondary}>Volver al dashboard</Link></section></div>;
}
