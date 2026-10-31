import { Suspense } from "react";
import { DefenseAccessError, loadDefense, loadDefenseReview } from "@/lib/defense/data";
import { DefenseShell, DefenseUnavailable } from "./defense-shell";
import DefenseStatus from "./defense-status";
import DefenseInstructions from "./defense-instructions";
import DefenseSession from "./defense-session";
import DefenseReceipt from "./defense-receipt";
import DefenseConfiguration from "./defense-configuration";
import DefenseReview from "./defense-review";
type Mode = "status" | "instructions" | "session" | "receipt" | "configuration" | "review";
const titles: Record<Mode, string> = { status: "Mi desafío · Defensa técnica", instructions: "Indicaciones de la defensa técnica", session: "Defensa técnica · Práctica local", receipt: "Estado y constancia de defensa", configuration: "Configurar defensa técnica", review: "Revisar defensa técnica" };
export default function DefenseRoute({ params, mode }: { params: Promise<{ slug?: string; submissionId?: string }>; mode: Mode }) {
  return <Suspense fallback={<main aria-busy="true" className="min-h-screen bg-[#f7f9fc] p-8 text-[#14263d]"><p role="status">Verificando acceso y cargando desafío…</p></main>}><Content params={params} mode={mode} /></Suspense>;
}
async function Content({ params, mode }: { params: Promise<{ slug?: string; submissionId?: string }>; mode: Mode }) {
  const identifiers = await params;
  const evaluator = mode === "configuration" || mode === "review";
  const base = "/challenges/" + encodeURIComponent(identifiers.slug ?? "") + "/defense";
  const current = mode === "review" ? "/evaluator/submissions/" + encodeURIComponent(identifiers.submissionId ?? "") + "/defense" : mode === "configuration" ? "/evaluator/challenges/" + encodeURIComponent(identifiers.slug ?? "") + "/defense" : mode === "status" ? base : base + "/" + mode;
  let data;
  try {
    data = mode === "review" ? await loadDefenseReview(identifiers.submissionId ?? "") : await loadDefense(identifiers.slug ?? "", evaluator);
  } catch (error) {
    if (error instanceof DefenseAccessError) return <DefenseUnavailable message={error.message} href={current} />;
    throw error;
  }
  const requiresSubmission = mode === "session" || mode === "instructions";
  return <DefenseShell data={data} evaluator={evaluator} title={titles[mode]}>
    {requiresSubmission && data.submission?.status !== "submitted" ? <DefenseUnavailable inline href={base} message="Necesitas una entrega de código enviada para explorar el cuestionario de este desafío." /> :
      mode === "status" ? <DefenseStatus data={data} /> :
      mode === "instructions" ? <DefenseInstructions data={data} /> :
      mode === "session" ? <DefenseSession data={data} /> :
      mode === "receipt" ? <DefenseReceipt data={data} /> :
      mode === "configuration" ? <DefenseConfiguration data={data} /> : <DefenseReview data={data} />}
  </DefenseShell>;
}
