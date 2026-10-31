"use client";

import { useState } from "react";
import Link from "next/link";
import { AiNotice, Badge, card, field, Icon, InterviewShell, primaryButton, secondaryButton } from "../_components/shared";
import { criteria, levels, type CriterionId, type Level } from "../_components/interview-data";

type Rating = { level: Level | null; note: string };
type Recommendation = "continue" | "review" | "stop";
const recommendations: { value: Recommendation; title: string; description: string }[] = [
  { value: "continue", title: "Recomendar siguiente fase", description: "Observación humana favorable" },
  { value: "review", title: "Recomendar revisión adicional", description: "Segunda opinión o ejercicio extra" },
  { value: "stop", title: "No recomendar continuidad", description: "Registrar las brechas observadas" },
];

export default function InterviewEvaluationPage() {
  const [ratings, setRatings] = useState<Record<CriterionId, Rating>>({
    communication: { level: null, note: "" },
    "problem-solving": { level: null, note: "" },
    rigor: { level: null, note: "" },
  });
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const complete = criteria.every(item => ratings[item.id].level !== null && ratings[item.id].note.trim()) && Boolean(summary.trim()) && recommendation !== null && reviewed;

  function updateRating(id: CriterionId, update: Partial<Rating>) {
    setRatings(previous => ({ ...previous, [id]: { ...previous[id], ...update } }));
    setPreview(false);
  }

  return <InterviewShell evaluation>
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Ruta de navegación" className="flex flex-wrap gap-2 text-xs text-[#536174]"><Link href="/evaluator" className="hover:text-blue-700">Panel Evaluador</Link><span aria-hidden="true">/</span><span className="font-semibold text-[#14263d]">Entrevista Técnica</span></nav>
        <Badge tone="neutral">Nueva revisión local</Badge>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl"><h1 className="text-2xl font-bold tracking-tight text-[#14263d] sm:text-[32px] sm:leading-10">Evaluación de Entrevista Técnica</h1><p className="mt-2 text-sm leading-relaxed text-[#536174] sm:text-base">Registro humano de observaciones, niveles orientativos y notas de la sesión con el candidato. La IA es responsable de la calificación final.</p></div>
        <Badge>Espacio de revisión humana</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
        {[{ icon: "user" as const, label: "Estudiante", value: "Sin candidato vinculado" }, { icon: "code" as const, label: "Desafío", value: "Sin desafío vinculado" }, { icon: "clock" as const, label: "Sesión", value: "Sin sesión vinculada" }].map(item => <div key={item.label} className="flex min-w-0 items-start gap-2 rounded-lg bg-[#eff3ff] px-3 py-2 text-xs"><Icon name={item.icon} className="size-4 text-[#536174]" /><span className="text-[#536174]">{item.label}: <strong className="font-semibold text-[#14263d]">{item.value}</strong></span></div>)}
        <Badge tone="neutral">Sin guardar</Badge>
      </div>
    </section>
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <div className="min-w-0 space-y-6 lg:col-span-8">
        <section aria-labelledby="rubric-heading" className={`${card} space-y-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2e8f0] pb-4"><div><h2 id="rubric-heading" className="flex items-center gap-2 text-xl font-semibold text-[#14263d]"><Icon name="document" className="size-6 text-[#165dcc]" />Criterios de Evaluación con Rúbrica</h2><p className="mt-2 text-sm leading-relaxed text-[#536174]">Describe el desempeño observado. Los niveles humanos son orientativos y no definen la nota final.</p></div><Badge>3 dimensiones clave</Badge></div>
          {criteria.map((criterion, index) => <fieldset key={criterion.id} className="min-w-0 rounded-xl border border-[#e2e8f0] bg-[#eff3ff]/60 p-4">
            <legend className="max-w-full px-1 text-sm font-bold text-[#14263d]">{index + 1}. {criterion.title}</legend>
            <p className="text-xs leading-relaxed text-[#536174]">{criterion.description}</p>
            <div role="group" aria-label={`Nivel humano: ${criterion.title}`} aria-describedby={attempted && ratings[criterion.id].level === null ? `level-error-${criterion.id}` : undefined} className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
              {levels.map(level => <button key={level.value} type="button" aria-pressed={ratings[criterion.id].level === level.value} onClick={() => updateRating(criterion.id, { level: level.value })} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs transition-colors ${ratings[criterion.id].level === level.value ? "border-[#165dcc] bg-[#165dcc] font-semibold text-white" : "border-[#e2e8f0] bg-white text-[#536174] hover:border-blue-400"}`}>{ratings[criterion.id].level === level.value && <Icon name="check" className="size-3.5" />}<span>{level.value}. {level.label}</span></button>)}
            </div>
            {attempted && ratings[criterion.id].level === null && <p id={`level-error-${criterion.id}`} className="mt-2 text-xs text-red-700">Selecciona un nivel para esta dimensión.</p>}
            <label className="mt-4 block text-xs font-semibold" htmlFor={`note-${criterion.id}`}>Observaciones técnicas <span className="text-red-600">*</span></label>
            <textarea id={`note-${criterion.id}`} maxLength={5000} rows={3} required value={ratings[criterion.id].note} onChange={event => updateRating(criterion.id, { note: event.target.value })} aria-invalid={attempted && !ratings[criterion.id].note.trim()} aria-describedby={attempted && !ratings[criterion.id].note.trim() ? `note-error-${criterion.id}` : undefined} className={`${field} mt-2`} />
            {attempted && !ratings[criterion.id].note.trim() && <p id={`note-error-${criterion.id}`} className="mt-2 text-xs text-red-700">Añade una observación para esta dimensión.</p>}
          </fieldset>)}
        </section>
        <section className={`${card} space-y-5`}>
          <h2 className="flex items-center gap-2 border-b border-[#e2e8f0] pb-4 text-xl font-semibold text-[#14263d]"><Icon name="message" className="text-[#165dcc]" />Notas Generales y Síntesis Ejecutiva</h2>
          <div><label htmlFor="interview-summary" className="text-sm font-semibold">Síntesis de la entrevista <span className="text-red-600">*</span></label><p id="summary-help" className="mt-1 text-xs leading-relaxed text-[#536174]">Registra evidencias, fortalezas y oportunidades de mejora. No incluyas una calificación final.</p><textarea id="interview-summary" aria-describedby="summary-help" aria-invalid={attempted && !summary.trim()} rows={6} maxLength={10000} required value={summary} onChange={event => { setSummary(event.target.value); setPreview(false); }} className={`${field} mt-3`} />{attempted && !summary.trim() && <p className="mt-2 text-xs text-red-700">Completa la síntesis de la entrevista.</p>}</div>
          <label className="block text-sm font-semibold">Registro de preguntas realizadas<textarea rows={4} maxLength={10000} value={questions} onChange={event => { setQuestions(event.target.value); setPreview(false); }} className={`${field} mt-3`} /></label>
        </section>
      </div>
      <aside aria-label="Recomendación y resumen de la sesión" className="min-w-0 space-y-6 lg:col-span-4">
        <section className={`${card} space-y-4`}>
          <h2 className="flex items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3 text-lg font-semibold text-[#14263d]">Recomendación del entrevistador<Icon name="document" className="text-[#165dcc]" /></h2>
          <p className="text-xs leading-relaxed text-[#536174]">Selecciona una recomendación humana. La calificación final corresponde a la IA.</p>
          <fieldset aria-describedby={attempted && recommendation === null ? "recommendation-error" : undefined} className="space-y-2"><legend className="sr-only">Recomendación humana</legend>{recommendations.map(item => <label key={item.value} className={`flex items-start gap-3 rounded-xl border-2 p-3.5 transition-colors ${recommendation === item.value ? "border-[#165dcc] bg-[#f0f6ff]" : "border-transparent bg-[#eff3ff]/70"}`}><input type="radio" name="recommendation" value={item.value} checked={recommendation === item.value} onChange={() => { setRecommendation(item.value); setPreview(false); }} className="mt-1 size-4 shrink-0" /><span><span className={`block text-sm font-semibold ${recommendation === item.value ? "text-[#165dcc]" : "text-[#14263d]"}`}>{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-[#536174]">{item.description}</span></span></label>)}</fieldset>
          {attempted && recommendation === null && <p id="recommendation-error" className="text-xs text-red-700">Selecciona una recomendación.</p>}
          <label className="flex items-start gap-3 rounded-xl border border-[#e2e8f0] bg-slate-50 p-3 text-xs leading-relaxed"><input type="checkbox" checked={reviewed} onChange={event => { setReviewed(event.target.checked); setPreview(false); }} className="mt-0.5 size-4 shrink-0" /><span>He revisado las notas de esta previsualización. Esta casilla es una interacción local; no genera una certificación.</span></label>
          <button type="button" onClick={() => { setAttempted(true); setPreview(complete); }} className={`${primaryButton} w-full`}><Icon name="document" />Previsualizar revisión humana</button>
          <button type="button" disabled className={`${secondaryButton} w-full`} title="No existe una conexión de guardado de entrevistas"><Icon name="save" />Guardar borrador · No disponible</button>
          <p className="text-xs leading-relaxed text-[#536174]">Esta revisión no está vinculada a una entrevista. El contenido se pierde al salir o recargar. Finalización, envío y notificaciones no disponibles.</p>
          {attempted && !complete && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-[#985b00]">Selecciona un nivel y añade una observación en las tres dimensiones. Completa la síntesis, elige una recomendación y marca la casilla de revisión para ver el resumen local.</p>}
        </section>
        <AiNotice />
        <section className={`${card} space-y-4`}><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Icon name="history" className="text-[#165dcc]" />Bitácora de la Sesión</h2><Badge tone="neutral">Sin sesión vinculada</Badge></div><p className="text-sm leading-relaxed text-[#536174]">No hay eventos disponibles. La bitácora aparecerá cuando exista una sesión real conectada.</p></section>
      </aside>
    </div>
    {preview && <section aria-live="polite" className={`${card} space-y-4 border-blue-200`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Vista previa local de revisión humana</h2><Badge>Sin guardar ni enviar</Badge></div>
      <p className="text-sm font-semibold text-[#165dcc]">{recommendations.find(item => item.value === recommendation)?.title}</p>
      <div className="grid gap-4 md:grid-cols-3">{criteria.map(criterion => <div key={criterion.id} className="rounded-lg bg-slate-50 p-4"><h3 className="text-sm font-semibold">{criterion.title}</h3><p className="mt-2 text-xs font-semibold text-[#165dcc]">Nivel humano {ratings[criterion.id].level} · {levels.find(level => level.value === ratings[criterion.id].level)?.label}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#536174]">{ratings[criterion.id].note}</p></div>)}</div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{summary}</p>
      {questions.trim() && <div><h3 className="text-sm font-semibold">Preguntas registradas</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#536174]">{questions}</p></div>}
      <AiNotice /><button type="button" onClick={() => setPreview(false)} className={secondaryButton}>Cerrar vista previa</button>
    </section>}
  </InterviewShell>;
}
