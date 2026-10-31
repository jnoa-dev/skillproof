"use client";
import { useEffect, useRef, type ReactNode } from "react";
export const card = "rounded-xl border border-slate-200 bg-white p-6 shadow-sm";
export const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#165dcc] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#124da8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-[.98]";
export const secondary = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-[#14263d] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50";
export const field = "w-full rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm focus:border-blue-600 focus:outline-2 focus:outline-blue-100 disabled:bg-slate-50";
export function LoadingDefense() { return <section aria-busy="true" className={`${card} space-y-5`}><p role="status" className="text-sm text-slate-600">Cargando defensa técnica…</p><div aria-hidden="true" className="carga-animada space-y-4"><div className="h-8 w-2/3 rounded bg-slate-200"/><div className="h-4 w-full rounded bg-slate-100"/><div className="h-44 rounded bg-slate-100"/></div></section>; }
export function DefenseDialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} onCancel={e => { e.preventDefault(); close(); }} aria-labelledby="defense-dialog-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-[#14263d] shadow-2xl backdrop:bg-slate-900/55 backdrop:backdrop-blur-sm"><div className="flex items-center justify-between gap-4"><h2 id="defense-dialog-title" className="text-xl font-semibold">{title}</h2><button type="button" aria-label="Cerrar" onClick={close} className="rounded px-2 py-1 focus-visible:outline-2 focus-visible:outline-blue-700">×</button></div>{children}</dialog>;
}
