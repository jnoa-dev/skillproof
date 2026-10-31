"use client";

import { useState } from "react";
import Link from "next/link";
import type { DefenseData } from "@/lib/defense/types";
import { Badge, primary, secondary } from "./defense-shell";

const rules = [
  { symbol: "◷", title: "Elige el tiempo de tu práctica", description: "El cronómetro comienza al pulsar Iniciar en el cuestionario. Al llegar a cero se muestra una alerta; no se envía ninguna respuesta.", tone: "bg-[#eff3ff] text-[#165dcc]" },
  { symbol: "⊘", title: "Responde con tus propias palabras", description: "Explica lo que realmente implementaste. Esta interfaz no puede impedir el uso de IA ni comprobar si utilizaste otro dispositivo.", tone: "bg-[#ffdad6] text-[#b42318]" },
  { symbol: "▣", title: "Cambios de visibilidad de la página", description: "Puedes explorar avisos locales al ocultar la pestaña. No se guardan en un reporte, no demuestran trampas y no producen sanciones.", tone: "bg-[#d9e2ff] text-[#165dcc]" },
  { symbol: "↳", title: "Redacción y pegado de texto", description: "El pegado está permitido en esta previsualización. No hay una política oficial de defensa conectada.", tone: "bg-[#eff3ff] text-[#14263d]" },
  { symbol: "‹›", title: "Tus respuestas deben respaldar tu código", description: "Practica con preguntas sugeridas a partir de los requisitos publicados. No se comparan automáticamente tus respuestas con el repositorio.", tone: "bg-[#95f1ff] text-[#006874]" },
];

export default function DefenseInstructions({ data }: { data: DefenseData }) {
  const [accepted, setAccepted] = useState(false);
  const base = "/challenges/" + encodeURIComponent(data.slug) + "/defense";
  return <div className="mx-auto max-w-[810px] space-y-7">
    <div><Badge>Paso previo · Práctica local</Badge><h2 className="mt-4 text-3xl font-bold tracking-tight text-[#121c2a]">Antes de empezar tu defensa técnica</h2><p className="mt-3 leading-relaxed text-[#536174]">Lee con atención. Explorarás el cuestionario sin iniciar una defensa oficial.</p></div>
    <section className="space-y-9 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm sm:space-y-12 sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#eff3ff] p-5"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-white text-xl text-[#165dcc]">◇</span><div><h3 className="font-semibold">Preparación de la defensa técnica</h3><p className="mt-1 text-xs text-[#536174]">Sin sesión oficial ni auditoría conectada</p></div></div><Badge>Solo previsualización</Badge></div>
      {rules.map(rule => <div key={rule.title} className="flex items-start gap-4"><span aria-hidden="true" className={"flex size-13 shrink-0 items-center justify-center rounded-xl text-2xl " + rule.tone}>{rule.symbol}</span><div><h3 className="text-xl font-semibold text-[#121c2a]">{rule.title}</h3><p className="mt-2 text-sm leading-6 text-[#536174]">{rule.description}</p></div></div>)}
      <div className="rounded-xl bg-[#eff3ff] p-5"><p className="text-sm font-semibold">Responderás sobre tu entrega</p><p className="mt-2 break-all font-mono text-xs text-[#165dcc]">{data.submission?.github_repo_url || "Repositorio no disponible"}</p><details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold">{data.questions.length} requisitos publicados</summary><ol className="mt-3 list-inside list-decimal space-y-2">{data.questions.map(q => <li key={q.id}>{q.requirement}</li>)}</ol></details></div>
      <label className="flex items-start gap-3 rounded-xl bg-[#e6eeff] p-5"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[#165dcc]" /><span className="text-sm font-semibold leading-6">Leí las indicaciones y entiendo que mis respuestas son una práctica local.<span className="mt-1 block text-xs font-normal text-[#536174]">No se guardarán ni enviarán; el contenido se pierde al salir o recargar.</span></span></label>
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href={base} className={secondary}>← Volver</Link>{accepted && data.questions.length > 0 ? <Link href={base + "/session"} className={primary}>Abrir práctica →</Link> : <button disabled className={primary}>Abrir práctica</button>}</div>
      <p className="text-center text-xs leading-relaxed text-[#536174]">No hay recuperación remota ni constancia de envío en esta etapa.</p>
    </section>
  </div>;
}
