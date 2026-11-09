"use client";

import { useEffect, useState } from "react";
import type { DefenseData } from "@/lib/defense/types";
import { card, field, primary, secondary } from "./defense-shell";
import DefenseDialog from "./defense-dialogs";

export default function DefenseSession({ data }: { data: DefenseData }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [minutes, setMinutes] = useState(30);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [monitor, setMonitor] = useState(false);
  const [departures, setDepartures] = useState(0);
  const [dialog, setDialog] = useState<"visibility" | "confirm" | null>(null);

  useEffect(() => {
    if (deadline === null) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const interval = window.setInterval(update, 500);
    return () => window.clearInterval(interval);
  }, [deadline]);
  useEffect(() => {
    if (!monitor || deadline === null) return;
    const changed = () => {
      if (Date.now() < deadline && document.visibilityState === "hidden") {
        setDepartures(n => n + 1);
        setDialog("visibility");
      }
    };
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, [monitor, deadline]);

  const question = data.questions[index];
  const completed = data.questions.filter(q => answers[q.id]?.trim()).length;
  const firstPending = data.questions.findIndex(q => !answers[q.id]?.trim());
  const expired = deadline !== null && remaining === 0;
  const warning = remaining !== null && remaining <= 300;
  const clock = remaining ?? minutes * 60;
  if (!question) return <section className={card}><h2 className="font-semibold">No hay requisitos publicados</h2><p className="mt-3 text-sm">No se pueden sugerir preguntas sin requisitos.</p></section>;

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
        <div><h2 className="font-semibold text-[#14263d]">Defensa técnica · {data.title}</h2><p className="mt-1 text-xs text-[#536174]">Pregunta {index + 1} de {data.questions.length} · Respuestas locales, sin guardar</p></div>
        <div className="flex flex-wrap items-center gap-3">
          {deadline === null && <><label className="text-xs font-semibold">Duración de práctica<select value={minutes} onChange={e => setMinutes(Number(e.target.value))} className={field + " mt-1 py-2 text-sm"}>{[5, 20, 30, 45].map(n => <option key={n} value={n}>{n} min</option>)}</select></label><button className={primary} onClick={() => { setRemaining(minutes * 60); setDeadline(Date.now() + minutes * 60000); }}>Iniciar práctica</button></>}
          <p role="timer" aria-label="Tiempo restante de práctica" className={"rounded-full border px-4 py-2 text-lg font-bold tabular-nums " + (warning ? "border-amber-400 bg-amber-50 text-[#985b00]" : "border-[#e2e8f0] text-[#165dcc]")}>◷ {String(Math.floor(clock / 60)).padStart(2, "0")}:{String(clock % 60).padStart(2, "0")}</p>
        </div>
      </div>
      {warning && <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 bg-[#fff3bf] px-5 py-4 text-sm text-[#985b00]"><p><strong>{expired ? "Terminó el tiempo de práctica." : "Quedan 5 minutos o menos."}</strong> {expired ? "No se envió ninguna respuesta." : "Revisa tus respuestas pendientes."}</p><span className="rounded-full border border-amber-300 px-3 py-1 text-xs">{completed} requisitos con texto · {data.questions.length - completed} pendientes</span></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f1e6cc] bg-[#fff8e8] px-5 py-3 text-xs text-[#985b00]"><span>Práctica local · Sin envío automático · Pegado permitido</span><label className="flex items-center gap-2"><input type="checkbox" checked={monitor} onChange={e => setMonitor(e.target.checked)} className="size-4" />Avisos locales de visibilidad: {departures}</label></div>
    </section>
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <aside className="space-y-6 lg:col-span-4">
        <section className={card}><h2 className="text-xl font-semibold">Requisitos del desafío</h2><nav aria-label="Preguntas" className="mt-5 space-y-3">{data.questions.map((q, i) => {
          const answered = Boolean(answers[q.id]?.trim());
          return <button key={q.id} onClick={() => setIndex(i)} aria-current={i === index ? "step" : undefined} className={"flex w-full items-center gap-3 rounded-lg border p-3.5 text-left text-sm " + (i === index ? "border-2 border-[#165dcc] bg-[#eff6ff]" : answered ? "border-[#b8e3cd] bg-[#edf8f2]" : "border-[#e2e8f0] bg-[#f7f9fc] text-[#536174]")}><span aria-hidden="true" className={"flex size-6 shrink-0 items-center justify-center rounded-full font-semibold " + (i === index ? "bg-[#165dcc] text-white" : answered ? "text-[#167347]" : "bg-[#e2e8f0]")}>{answered ? "✓" : i + 1}</span><span className="min-w-0 flex-1 font-medium">{q.requirement}</span><span className={"shrink-0 text-[10px] font-semibold uppercase " + (answered ? "text-[#167347]" : i === index ? "text-[#165dcc]" : "")}>{i === index ? "Actual" : answered ? "Con texto" : "Pendiente"}</span></button>;
        })}</nav></section>
        <section className={card + " flex gap-4"}><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eff3ff] text-xl text-[#165dcc]">♧</span><div><h3 className="font-semibold">Recuerda</h3><p className="mt-2 text-sm leading-6 text-[#536174]">Responde con lo que tú hiciste. Las preguntas son sugerencias; no existe una evaluación de IA conectada.</p></div></section>
      </aside>
      <section className={card + " min-w-0 space-y-6 lg:col-span-8"}>
        <span className="inline-flex rounded-full border border-blue-100 bg-[#eff6ff] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[#165dcc]">Requisito {index + 1} de {data.questions.length}</span>
        <blockquote className="border-l-4 border-[#165dcc] bg-[#f7f9fc] p-5 text-sm leading-6"><span className="text-[#536174]">El desafío pedía: </span>{question.requirement}</blockquote>
        <h2 className="text-xl leading-8 font-semibold text-[#14263d] sm:text-2xl">{question.prompt}</h2>
        <label className="block text-sm font-semibold" htmlFor="defense-answer">Tu respuesta<textarea id="defense-answer" rows={11} maxLength={10000} value={answers[question.id] ?? ""} onChange={e => setAnswers(previous => ({ ...previous, [question.id]: e.target.value }))} className={field + " mt-3 font-normal leading-7"} aria-describedby="answer-help" /></label>
        <div id="answer-help" className="flex flex-wrap justify-between gap-2 text-xs text-[#536174]"><span>ⓘ Explica con tus palabras. Sin mínimo oficial configurado.</span><span className="text-[#167347]">{(answers[question.id] ?? "").length} / 10000 caracteres</span></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-6"><button disabled={index === 0} onClick={() => setIndex(i => i - 1)} className={secondary}>← Anterior</button><span className="text-xs text-[#536174]">Puedes volver a preguntas anteriores</span>{index < data.questions.length - 1 ? <button className={primary} onClick={() => setIndex(i => i + 1)}>Siguiente →</button> : <button className={primary} onClick={() => setDialog("confirm")}>Revisar respuestas</button>}</div>
        <button onClick={() => setDialog("confirm")} className="text-sm font-semibold text-[#165dcc] underline underline-offset-4">Abrir resumen previo al envío · Vista local</button>
      </section>
    </div>
    <section className="space-y-5 pt-3"><h2 className="text-lg font-semibold">Así se ven las demás preguntas</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.questions.filter(q => q.id !== question.id).map(q => <button key={q.id} onClick={() => setIndex(data.questions.findIndex(item => item.id === q.id))} className={card + " text-left hover:border-[#165dcc]"}><span className="text-xs font-semibold uppercase text-[#165dcc]">Requisito {q.id} de {data.questions.length}</span><p className="mt-3 text-sm text-[#536174]">{q.requirement}</p><p className="mt-3 text-sm font-semibold leading-6">{q.prompt}</p></button>)}</div></section>
    {dialog && <DefenseDialog title={dialog === "visibility" ? "La pestaña dejó de estar visible" : "Revisa tu defensa técnica"} close={() => setDialog(null)}>
      {dialog === "visibility" ? <p>El navegador notificó un cambio de visibilidad. Es el evento local {departures}; no se guarda en un reporte ni se aplica una sanción.</p> : <>
        <p className="text-[#536174]">{completed} de {data.questions.length} requisitos tienen una respuesta local. {firstPending >= 0 ? "Todavía tienes requisitos sin responder." : "Todos los requisitos tienen texto."}<span className="mt-2 block">Esta vista no envía respuestas ni confirma una defensa oficial.</span></p>
        <ul className="overflow-hidden rounded-xl border border-[#e2e8f0]">{data.questions.map((q, i) => {
          const answered = Boolean(answers[q.id]?.trim());
          return <li key={q.id} className={"flex items-center justify-between gap-4 border-b border-[#e2e8f0] p-4 last:border-b-0 " + (answered ? "bg-[#f7f9fc]" : "bg-amber-50/50")}><span className="flex items-start gap-3"><span aria-hidden="true" className={answered ? "text-[#167347]" : "text-[#985b00]"}>{answered ? "✓" : "!"}</span><span>{i + 1}. {q.requirement}</span></span><span className={"shrink-0 rounded-full px-3 py-1 text-xs font-semibold " + (answered ? "bg-green-100 text-[#167347]" : "bg-amber-100 text-[#985b00]")}>{answered ? "Con texto" : "Sin responder"}</span></li>;
        })}</ul>
        <div className="flex flex-wrap justify-end gap-3">{firstPending >= 0 && <button className={secondary} onClick={() => { setIndex(firstPending); setDialog(null); }}>Ir al requisito {firstPending + 1}</button>}<button disabled className={primary}>Enviar respuestas · No disponible</button></div>
      </>}
    </DefenseDialog>}
  </div>;
}
