"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useInterviewProfile } from "./profile-context";

export const card = "rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:p-6";
export const field = "w-full rounded-lg border border-[#cbd5e1] bg-white p-3 text-sm leading-relaxed text-[#17212f] placeholder:text-slate-400";
export const primaryButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#165dcc] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#124ead] disabled:bg-slate-200 disabled:text-slate-500";
export const secondaryButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-semibold text-[#165dcc] transition-colors hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500";

type IconName = "check" | "history" | "message" | "document" | "clock" | "arrow" | "shield" | "user" | "code" | "star" | "send" | "save";
const paths: Record<IconName, ReactNode> = {
  check: <path d="m5 12 4 4L19 6" />,
  history: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
  message: <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />,
  document: <><path d="M14 2H5v20h14V7Zm0 0v6h5M8 12h8M8 16h6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" /><path d="m8 11 3 3 5-5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></>,
  code: <path d="m7 6-6 6 6 6m10-12 6 6-6 6M14 3l-4 18" />,
  star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />,
  send: <path d="m22 2-7 20-4-9L2 9Zm0 0L11 13" />,
  save: <><path d="M4 3h13l4 4v14H3V3Zm3 0v6h9V3M7 21v-8h10v8" /></>,
};
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg aria-hidden="true" className={`size-5 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "neutral" }) {
  const colors = { blue: "border-blue-200 bg-blue-50 text-[#165dcc]", green: "border-emerald-200 bg-[#edf8f2] text-[#167347]", amber: "border-amber-200 bg-[#fef6ee] text-[#985b00]", neutral: "border-slate-200 bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}>{children}</span>;
}

export function InterviewShell({ evaluation = false, children }: { evaluation?: boolean; children: ReactNode }) {
  const profile = useInterviewProfile();
  const name = profile.name || "Mi cuenta";
  const role = profile.role === "admin" ? "Administrador" : profile.role === "evaluator" ? "Evaluador" : profile.role === "student" ? "Estudiante" : "Rol no disponible";
  const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const navigation = evaluation
    ? [{ href: "/evaluator", label: "Panel Evaluador" }, { href: "/interviews/evaluation", label: "Evaluación de Entrevistas" }, { href: "/interviews", label: "Vista estudiante" }, { href: "/passport", label: "Pasaporte Público" }]
    : [{ href: "/dashboard", label: "Dashboard" }, { href: "/interviews", label: "Entrevistas" }, { href: "/passport", label: "Pasaporte Público" }];
  return <div className="flex min-h-screen flex-col">
    <header className="sticky top-0 z-30 border-b border-[#e2e8f0] bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 px-4 sm:px-6 lg:px-8">
        <Link href={evaluation ? "/evaluator" : "/dashboard"} className="flex min-h-16 items-center gap-2 text-xl font-extrabold tracking-tight text-[#165dcc]">
          {evaluation ? <span className="flex size-8 items-center justify-center rounded-lg bg-[#165dcc] text-sm text-white">SP</span> : <Icon name="shield" className="size-7" />}SKILLPROOF
        </Link>
        <Link href="/account" aria-label="Mi cuenta" className="flex items-center gap-3 rounded-lg py-2">
          <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{name}</p><p className="text-xs text-[#536174]">{role}</p></div>
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-[#165dcc] text-xs font-bold text-white ring-2 ring-blue-100">{initials || <Icon name="user" />}</span>
        </Link>
        <nav aria-label={evaluation ? "Navegación del evaluador" : "Navegación del estudiante"} className="order-last flex w-full gap-5 overflow-x-auto text-sm lg:order-none lg:w-auto lg:flex-1 lg:justify-center">
          {navigation.map(item => <Link key={item.href} href={item.href} aria-current={item.href === (evaluation ? "/interviews/evaluation" : "/interviews") ? "page" : undefined} className={`flex min-h-12 shrink-0 items-center border-b-2 px-1 lg:min-h-16 ${item.href === (evaluation ? "/interviews/evaluation" : "/interviews") ? "border-[#165dcc] font-semibold text-[#165dcc]" : "border-transparent text-[#536174] hover:text-[#165dcc]"}`}>{item.label}</Link>)}
        </nav>
      </div>
    </header>
    <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div role="note" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
        <strong className="uppercase tracking-wide">Entrevistas sin conexión</strong>
        <span>Aún no hay una fuente de entrevistas conectada. Las notas que escribas solo permanecen en esta pantalla; se pierden al salir o recargar. No se guardan ni se envían.</span>
      </div>
      {children}
    </main>
    <footer className="border-t border-[#e2e8f0] bg-white px-4 py-5 text-xs text-[#536174] sm:px-8"><div className="mx-auto flex max-w-[1376px] flex-wrap justify-between gap-3"><span>© 2026 SKILLPROOF · Plataforma Técnica de Competencias y Auditoría</span><span>Entrevistas técnicas</span></div></footer>
  </div>;
}

export function AiNotice() {
  return <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-relaxed text-[#536174]"><Icon name="shield" className="text-[#165dcc]" /><p><strong className="block text-[#14263d]">La calificación final corresponde a la IA</strong>La revisión humana aporta observaciones de la entrevista. Sus niveles y recomendaciones no constituyen la calificación final. Los resultados solo se muestran cuando existe una evaluación de IA disponible.</p></div>;
}
