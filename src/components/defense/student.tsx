"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { answeredCount, remainingSeconds, type DefenseData, type DefenseSession } from "@/lib/defense/model";
import { card, primary, secondary, field, LoadingDefense, DefenseDialog } from "./shared";

export default function StudentDefense({ submissionId, title, challengePath, repository }: { submissionId: string; title: string; challengePath: string; repository: string | null }) {
  const [data, setData] = useState<DefenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("Sin cambios pendientes");
  const [seconds, setSeconds] = useState(0);
  const [modal, setModal] = useState<"exit" | "confirm" | null>(null);
  const sessionRef = useRef<DefenseSession | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const dirty = useRef(false);
  const blocked = useRef(false);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(new Set<string>());
  const clock = useRef({ server: 0, monotonic: 0 });

  const receive = useCallback((next: DefenseData, restore: boolean) => {
    sessionRef.current = next.session;
    clock.current = { server: Date.parse(next.server_time), monotonic: performance.now() };
    setData(next);
    if (next.session) {
      setSeconds(remainingSeconds(next.session.expires_at, clock.current.server));
      if (restore || next.session.status === "submitted") { answersRef.current = next.session.answers; setAnswers(next.session.answers); dirty.current = false; }
    }
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/defense?submissionId=${submissionId}`, { cache: "no-store" });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error || "No pudimos cargar la defensa.");
      receive(next, true); blocked.current = false;
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos conectar."); }
    finally { setLoading(false); }
  }, [submissionId, receive]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  // Una sola cola evita que el autoguardado, los eventos y el envío se adelanten entre sí.
  const enqueue = useCallback((action: "get" | "start" | "save" | "event" | "submit", extra: Record<string, unknown> = {}) => {
    if (action !== "event" && pending.current.has(action)) return chain.current;
    pending.current.add(action);
    const task = chain.current.then(async () => {
      if (blocked.current) return;
      if (sessionRef.current?.status === "submitted") return;
      if (action === "save" && !dirty.current) return;
      const snapshot = { ...answersRef.current };
      const payload = action === "save" || action === "submit" ? { answers: snapshot, revision: sessionRef.current?.revision } : extra;
      if (action === "save") setSaved("Guardando…");
      try {
        const response = await fetch(action === "get" ? `/api/defense?submissionId=${submissionId}` : "/api/defense", action === "get" ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId, action, payload }) });
        const next = await response.json();
        if (!response.ok) { if ([401, 403, 409].includes(response.status)) blocked.current = true; throw new Error(next.error || "No pudimos guardar."); }
        receive(next, action === "start"); setError("");
        if (action === "save" || action === "submit") {
          if (JSON.stringify(answersRef.current) === JSON.stringify(snapshot)) dirty.current = false;
          setSaved(dirty.current ? "Cambios pendientes" : "Guardado en el servidor");
        }
      } catch (e) { setSaved("Hay cambios sin confirmar"); setError(e instanceof Error ? e.message : "No pudimos conectar. Mantén esta página abierta y reintenta."); }
    });
    chain.current = task.catch(() => {}).finally(() => { pending.current.delete(action); });
    return task;
  }, [submissionId, receive]);
  const running = data?.session?.status === "in_progress";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const session = sessionRef.current;
      if (!session || session.status !== "in_progress") return;
      const left = remainingSeconds(session.expires_at, clock.current.server + performance.now() - clock.current.monotonic);
      setSeconds(left);
      if (!left) void enqueue("get");
      else if (dirty.current) void enqueue("save");
    }, 1500);
    const heartbeat = setInterval(() => { void enqueue("get"); }, 15000);
    const visibility = () => {
      if (document.visibilityState !== "hidden" || sessionRef.current?.status !== "in_progress") return;
      setModal("exit");
      void enqueue("save");
      void enqueue("event", { kind: "exit", nonce: crypto.randomUUID() });
    };
    const leaving = (e: BeforeUnloadEvent) => { if (sessionRef.current?.status === "in_progress") e.preventDefault(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", leaving);
    return () => { clearInterval(timer); clearInterval(heartbeat); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("beforeunload", leaving); };
  }, [running, enqueue]);

  if (loading) return <LoadingDefense/>;
  if (!data) return <section role="alert" className={card}><h2 className="text-xl font-semibold">Defensa técnica no disponible</h2><p className="mt-3 text-sm text-slate-600">{error}</p><button type="button" className={`${secondary} mt-5`} onClick={() => void load()}>Reintentar</button></section>;
  const config = data.config;
  const session = data.session;
  const questions = session?.questions || config?.questions.filter(q => q.enabled) || [];
  const count = answeredCount(questions, answers);
  const submitted = session?.status === "submitted";
  const safeRepo = repository && /^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(repository) ? repository : null;
  const errorBox = error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button type="button" onClick={() => { if (!blocked.current) void enqueue(dirty.current ? "save" : "get"); else if (!dirty.current || window.confirm("Hay respuestas sin guardar. ¿Recargar el estado del servidor y descartar esos cambios?")) void load(); }} className="mt-2 underline">Reintentar (un conflicto requiere recargar el estado)</button></div>;
  if (submitted && session) return <div className="space-y-6">{errorBox}<section className={`${card} border-teal-200`}><p className="text-sm font-semibold text-teal-800">✓ DEFENSA ENVIADA</p><h1 className="mt-3 text-3xl font-bold">Tu defensa técnica fue recibida</h1><p className="mt-3 text-slate-600">Tus respuestas están bloqueadas y disponibles para la revisión del evaluador.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><Stat label="Respuestas completas" value={`${count} de ${questions.length}`}/><Stat label="Salidas registradas" value={String(session.exits)}/><Stat label="Envío" value={session.submit_reason === "time" ? "Tiempo agotado" : session.submit_reason === "exits" ? "Límite de salidas" : "Manual"}/></div><p className="mt-5 text-sm text-slate-600">Recibida: {session.submitted_at ? new Date(session.submitted_at).toLocaleString("es-PE", { timeZone: "America/Lima" }) : "Fecha no disponible"}</p></section><section className={card}><h2 className="text-xl font-semibold">Pendiente de revisión</h2><p className="mt-3 text-sm leading-6 text-slate-600">La calificación final corresponde al evaluador. Las señales de navegación aportan contexto y no prueban por sí mismas el uso de ayuda externa.</p></section><Answers session={session}/><Link className={secondary} href={challengePath}>Volver a mi desafío</Link></div>;
  if (!running) return <div className="space-y-6">{errorBox}<p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Mi desafío · Defensa técnica</p><h1 className="text-3xl font-bold">{instructions ? "Indicaciones de la defensa técnica" : title}</h1><p className="text-slate-600">El código muestra lo que construiste. Tu defensa explica cómo lo hiciste.</p><div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]"><section className={card}><div className="mb-6 flex gap-3 text-xs font-semibold"><span className="rounded bg-teal-50 px-3 py-2 text-teal-800">✓ Código enviado</span><span className="rounded bg-blue-50 px-3 py-2 text-blue-800">2 · Defensa técnica</span><span className="rounded bg-slate-100 px-3 py-2 text-slate-600">3 · Resultado</span></div><h2 className="text-2xl font-bold">{instructions ? "Antes de comenzar" : "Demuestra que conoces tu solución"}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{config?.instructions || "El evaluador aún no ha habilitado la defensa técnica para este desafío."}</p>{config?.enabled && <><div className="my-6 grid gap-3 sm:grid-cols-3"><Stat label="Duración" value={`${config.duration_minutes} minutos`}/><Stat label="Requisitos" value={String(questions.length)}/><Stat label="Límite de salidas" value={String(config.max_exits)}/></div>{instructions ? <><ul className="space-y-3 rounded-lg bg-slate-50 p-5 text-sm leading-6 text-slate-700"><li>El tiempo comienza al pulsar «Comenzar defensa» y no se pausa.</li><li>Al agotarse el tiempo o alcanzar {config.max_exits} salidas registradas, se cierra la defensa con las respuestas guardadas.</li><li>{config.block_paste ? "No se permite pegar ni arrastrar texto en las respuestas." : "Puedes pegar texto; responde con tus propias palabras."}</li><li>Las respuestas se guardan al conectar con el servidor. Comprueba el indicador de guardado antes de salir.</li></ul><label className="my-6 flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 size-4 accent-blue-700"/>He leído las indicaciones y estoy listo para comenzar.</label><button type="button" disabled={!accepted || busy} className={primary} onClick={async () => { setBusy(true); await enqueue("start", { accepted: true }); setBusy(false); }}>{busy ? "Comenzando…" : "Comenzar defensa →"}</button></> : <button type="button" className={primary} onClick={() => setInstructions(true)}>Ver indicaciones →</button>}</>}</section><aside className={`${card} space-y-4`}><h2 className="font-semibold">Tu entrega</h2><p className="text-sm text-slate-600">Código enviado. Esta etapa no modifica tu repositorio.</p>{safeRepo && <a href={safeRepo} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-blue-700 underline">Ver repositorio ↗</a>}<Link href={`${challengePath}/submission`} className="block text-sm text-blue-700">Ver mi entrega →</Link></aside></div></div>;
  const current = questions[index];
  return <div>{errorBox}<div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-blue-700">Defensa técnica en curso</p><h1 className="mt-2 text-2xl font-bold">{title}</h1><p role="status" className="mt-2 text-xs text-slate-600">{saved}</p></div><div className={`rounded-xl border px-6 py-3 text-center ${seconds <= 300 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-blue-200 bg-white"}`}><p className="text-xs">Tiempo restante</p><p aria-label={`${Math.floor(seconds / 60)} minutos y ${seconds % 60} segundos`} className="mt-1 font-mono text-3xl font-bold tabular-nums">{Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}</p></div></div>{seconds <= 300 && <p role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{seconds ? "Te quedan 5 minutos o menos. Revisa y envía tus respuestas antes de que termine el tiempo." : "El tiempo terminó. Confirmando el cierre con el servidor…"}</p>}<div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Salidas registradas: <strong>{session?.exits} de {config?.max_exits}</strong>. Mantén esta página abierta durante la defensa.</div><div className="grid items-start gap-6 lg:grid-cols-[270px_1fr]"><aside className={card}><h2 className="font-semibold">Requisitos del desafío</h2><p className="my-3 text-xs text-slate-600">{count} de {questions.length} respuestas con al menos 80 caracteres</p><nav aria-label="Preguntas de la defensa" className="space-y-2">{questions.map((q, i) => <button type="button" key={q.requirement_index} onClick={() => setIndex(i)} aria-current={index === i ? "step" : undefined} className={`flex w-full gap-3 rounded-lg border p-3 text-left text-sm ${index === i ? "border-blue-600 bg-blue-50 text-blue-900" : "border-transparent hover:bg-slate-50"}`}><span>{(answers[String(i)] || "").trim().length >= 80 ? "✓" : i + 1}</span>{q.requirement}</button>)}</nav></aside><section className={card}>{current && <><p className="text-xs font-semibold text-blue-700">REQUISITO {index + 1} DE {questions.length}</p><h2 className="mt-3 text-xl font-bold">{current.requirement}</h2><p className="my-5 rounded-lg bg-slate-50 p-4 text-sm leading-6">{current.prompt}</p><label htmlFor="defense-answer" className="text-sm font-semibold">Tu respuesta</label><textarea id="defense-answer" rows={12} maxLength={10000} disabled={!seconds || busy} value={answers[String(index)] || ""} className={`${field} mt-2`} onPaste={e => { if (config?.block_paste) { e.preventDefault(); setError("Pegar texto está deshabilitado durante esta defensa."); void enqueue("event", { kind: "paste", nonce: crypto.randomUUID() }); } }} onDrop={e => { if (config?.block_paste) e.preventDefault(); }} onChange={e => { const next = { ...answersRef.current, [String(index)]: e.target.value }; answersRef.current = next; setAnswers(next); dirty.current = true; setSaved("Cambios pendientes"); }}/><p className="mt-2 text-xs text-slate-600">{(answers[String(index)] || "").length} / 10 000 caracteres · Recomendado: al menos 80 caracteres</p><div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" className={secondary} disabled={!index} onClick={() => setIndex(i => i - 1)}>← Anterior</button>{index < questions.length - 1 ? <button type="button" className={primary} onClick={() => setIndex(i => i + 1)}>Siguiente →</button> : <button type="button" className={primary} disabled={!seconds || busy} onClick={() => setModal("confirm")}>Enviar defensa</button>}</div></>}</section></div>{modal === "exit" && <DefenseDialog title="Se detectó una salida" close={() => setModal(null)}><p className="my-5 text-sm leading-6 text-slate-600">Salidas registradas: {session?.exits} de {config?.max_exits}. El tiempo sigue corriendo. Al alcanzar el límite se enviarán las respuestas guardadas.</p><button type="button" className={primary} onClick={() => setModal(null)}>Continuar defensa</button></DefenseDialog>}{modal === "confirm" && <DefenseDialog title="¿Enviar tu defensa técnica?" close={() => setModal(null)}><p className="my-5 text-sm leading-6 text-slate-600">Tienes {count} de {questions.length} respuestas con al menos 80 caracteres. Después de enviar, no podrás editarlas.</p><ul className="max-h-48 space-y-2 overflow-auto text-sm">{questions.map((q, i) => <li key={i}><button type="button" className="text-left text-blue-700 underline" onClick={() => { setIndex(i); setModal(null); }}>{(answers[String(i)] || "").trim().length >= 80 ? "✓" : "○"} {q.requirement}</button></li>)}</ul><div className="mt-6 flex justify-end gap-3"><button type="button" className={secondary} onClick={() => setModal(null)}>Seguir revisando</button><button type="button" className={primary} disabled={busy} onClick={async () => { setBusy(true); await enqueue("submit"); setBusy(false); setModal(null); }}>Confirmar envío</button></div></DefenseDialog>}</div>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>; }
export function Answers({ session }: { session: DefenseSession }) { return <section className={card}><h2 className="mb-5 text-xl font-semibold">Respuestas de la defensa</h2><div className="space-y-3">{session.questions.map((q, i) => <details key={q.requirement_index} className="rounded-lg border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-700">{i + 1}. {q.requirement}</summary><p className="mt-4 text-sm text-slate-600">{q.prompt}</p><p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-sm leading-7">{session.answers[String(i)] || "Sin respuesta"}</p></details>)}</div></section>; }
