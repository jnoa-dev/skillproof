"use client";


import { LoadingState } from "@/components/ui/loading-state";
import { useState } from "react";
import Link from "next/link";
import { AiNotice, Badge, card, field, Icon, InterviewShell, primaryButton, secondaryButton } from "./shared";
import type { InterviewSource } from "./interview-data";

export default function InterviewHistory({ source }: { source: InterviewSource }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { message: string; url: string }>>({});
  const [preview, setPreview] = useState(false);
  const interviews = source.status === "ready" ? source.interviews : [];
  const interview = interviews.find(item => item.id === selectedId) ?? null;
  const draft = interview ? drafts[interview.id] ?? { message: "", url: "" } : { message: "", url: "" };
  const pending = interviews.filter(item => item.responsePending).length;

  function updateDraft(key: "message" | "url", value: string) {
    if (!interview) return;
    setDrafts(previous => ({ ...previous, [interview.id]: { ...draft, [key]: value } }));
    setPreview(false);
  }

  return <InterviewShell>
    <section className="space-y-6">
      <div className="space-y-2"><nav aria-label="Ruta de navegación" className="mb-2 flex flex-wrap gap-2 text-xs text-[#536174]"><Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link><span aria-hidden="true">/</span><span className="font-semibold text-[#14263d]">Mis Entrevistas Técnicas</span></nav><h1 className="text-2xl font-extrabold tracking-tight text-[#14263d] sm:text-3xl">Mis Entrevistas Técnicas</h1><p className="max-w-3xl text-sm leading-relaxed text-[#536174] sm:text-base">Consulta tu historial de entrevistas técnicas y las observaciones disponibles de cada sesión.</p></div>
      <div className="grid gap-4 md:grid-cols-3">{[
        { icon: "message" as const, title: "Total Entrevistas", value: source.status === "ready" ? String(interviews.length) : "No disponible", detail: "Entrevistas registradas", color: "bg-blue-50 text-[#165dcc]" },
        { icon: "check" as const, title: "Estado General", value: source.status === "ready" ? interviews.length ? "Historial disponible" : "Sin entrevistas" : "Sin información", detail: "La calificación final corresponde a la IA", color: "bg-emerald-50 text-[#167347]" },
        { icon: "clock" as const, title: "Pendientes", value: source.status === "ready" ? String(pending) : "No disponible", detail: "Respuestas pendientes", color: "bg-amber-50 text-[#985b00]" },
      ].map(item => <div key={item.title} className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm"><span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${item.color}`}><Icon name={item.icon} className="size-6" /></span><div><p className="text-xs font-bold tracking-wider text-[#536174] uppercase">{item.title}</p><p className="mt-1 text-lg font-bold text-[#14263d] xl:text-xl">{item.value}</p><p className="mt-1 text-xs text-[#536174]">{item.detail}</p></div></div>)}</div>
    </section>
    <div className="grid items-start gap-8 lg:grid-cols-12">
      <section aria-labelledby="history-heading" className="space-y-4 lg:col-span-5">
        <div className="flex items-center justify-between gap-2"><h2 id="history-heading" className="flex items-center gap-2 text-lg font-bold"><Icon name="history" className="text-slate-500" />Historial de Entrevistas</h2>{source.status === "ready" && <Badge tone="neutral">{interviews.length} registros</Badge>}</div>
        {source.status === "disconnected" && <div role="status" className={`${card} py-10 text-center`}><Icon name="history" className="mx-auto mb-4 size-10 text-[#165dcc]" /><h3 className="font-semibold">Historial no disponible</h3><p className="mt-3 text-sm leading-relaxed text-[#536174]">Aún no hay una fuente de entrevistas conectada. Cuando esté disponible, podrás consultar aquí tus sesiones.</p></div>}
        {source.status === "loading" && <LoadingState compact label="Cargando entrevistas…"/>}
        {source.status === "error" && <div role="alert" className={card}><h3 className="font-semibold text-red-700">No pudimos cargar las entrevistas</h3><p className="mt-3 text-sm text-[#536174]">Inténtalo nuevamente para consultar tu historial.</p><a href="/interviews" className={`${secondaryButton} mt-4`}>Reintentar</a></div>}
        {source.status === "ready" && !interviews.length && <div role="status" className={`${card} py-10 text-center`}><Icon name="message" className="mx-auto mb-4 size-10 text-[#165dcc]" /><h3 className="font-semibold">No hay entrevistas registradas</h3><p className="mt-3 text-sm leading-relaxed text-[#536174]">Tus entrevistas aparecerán aquí cuando se registren.</p></div>}
        <div className="space-y-3.5">{interviews.map(item => <button key={item.id} type="button" aria-pressed={selectedId === item.id} onClick={() => { setSelectedId(item.id); setPreview(false); }} className={`w-full rounded-xl border bg-white p-5 text-left ${selectedId === item.id ? "border-2 border-[#165dcc] shadow-md" : "border-slate-200 shadow-sm hover:border-slate-400"}`}><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Badge tone={item.responsePending ? "amber" : "neutral"}>{item.responsePending ? "Pendiente de tu respuesta" : "Entrevista registrada"}</Badge><span className="font-mono text-xs text-[#536174]">{item.id}</span></div><h3 className="font-bold">{item.title}</h3>{item.evaluatorName && <p className="mt-2 text-xs text-[#536174]">{item.evaluatorName}</p>}{item.date && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-[#536174]">{item.date}</p>}</button>)}</div>
        <AiNotice />
      </section>
      <section aria-labelledby="detail-heading" className="min-w-0 space-y-6 lg:col-span-7">
        {!interview ? <div className={`${card} py-16 text-center`}><Icon name="document" className="mx-auto mb-4 size-12 text-slate-300" /><h2 id="detail-heading" className="text-xl font-bold">Detalle de la entrevista</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#536174]">{interviews.length ? "Selecciona una entrevista para consultar sus datos." : "No hay una entrevista seleccionada. El detalle y el feedback se mostrarán cuando existan datos disponibles."}</p></div> : <>
          <div className={`${card} space-y-6 sm:p-7`}><div className="border-b border-slate-100 pb-4"><p className="font-mono text-xs text-[#536174]">EXPEDIENTE DE SESIÓN</p><h2 id="detail-heading" className="mt-1 text-xl font-bold">{interview.title}</h2>{interview.evaluatorName && <p className="mt-2 text-sm text-[#536174]">{interview.evaluatorName}</p>}</div>
            {interview.feedback ? <section className="space-y-4"><h3 className="text-sm font-bold">Feedback del evaluador humano</h3>{interview.feedback.summary && <p className="whitespace-pre-wrap break-words rounded-xl border-l-4 border-[#165dcc] bg-slate-50 p-4 text-sm leading-relaxed">{interview.feedback.summary}</p>}{interview.feedback.recommendation && <p className="text-sm"><strong>Recomendación humana:</strong> {interview.feedback.recommendation}</p>}{interview.feedback.criteria.map(criterion => <div key={criterion.id} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3"><h4 className="text-xs font-bold">{criterion.title}</h4>{criterion.level !== null && <Badge>Nivel {criterion.level} · Observación humana</Badge>}{criterion.observation && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[#536174]">{criterion.observation}</p>}</div>)}</section> : <p className="text-sm text-[#536174]">Aún no hay feedback disponible para esta entrevista.</p>}
            {interview.aiResult && <section className="border-t border-slate-100 pt-4"><h3 className="text-sm font-bold">Calificación final de IA</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{interview.aiResult}</p></section>}
          </div>
          {interview.responsePending && <div className={`${card} space-y-5`}><h3 className="text-lg font-bold">Tu Respuesta a la Entrevista</h3><form onSubmit={event => { event.preventDefault(); if (draft.message.trim()) setPreview(true); }} className="space-y-4"><label className="block text-xs font-semibold">Mensaje o aclaraciones técnicas *<textarea required maxLength={5000} rows={5} value={draft.message} onChange={event => updateDraft("message", event.target.value)} className={`${field} mt-2`} /></label><p className="text-xs text-[#536174]">{draft.message.length}/5000 caracteres</p><label className="block text-xs font-semibold">Enlace complementario (opcional)<input type="url" value={draft.url} onChange={event => updateDraft("url", event.target.value)} placeholder="https://..." className={`${field} mt-2`} /></label><p className="text-xs text-[#536174]">Vista previa local. El contenido se pierde al salir o recargar; no se guarda ni se envía.</p><div className="flex flex-wrap gap-3"><button type="submit" disabled={!draft.message.trim()} className={primaryButton}>Previsualizar respuesta</button><button type="button" disabled className={secondaryButton}>Guardar · No disponible</button></div></form>{preview && <section aria-live="polite" className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4"><h4 className="text-sm font-bold">Vista previa local · No enviada</h4><p className="whitespace-pre-wrap break-words text-sm">{draft.message}</p>{draft.url && <p className="break-all text-xs">{draft.url}</p>}<button type="button" onClick={() => setPreview(false)} className={secondaryButton}>Cerrar vista previa</button></section>}</div>}
        </>}
      </section>
    </div>
  </InterviewShell>;
}
