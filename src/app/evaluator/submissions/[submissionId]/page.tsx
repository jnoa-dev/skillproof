import { Suspense } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EvaluationPanel from "@/components/evaluator/evaluation-panel";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function EvaluacionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  return <Suspense fallback={<main role="status" aria-busy="true" className="min-h-screen bg-[#f8f9ff] p-8"><span className="sr-only">Cargando evaluación...</span><div aria-hidden="true" className="carga-animada mx-auto max-w-[1200px] space-y-6"><div className="h-10 w-2/3 rounded bg-slate-200"/><div className="grid gap-6 lg:grid-cols-2">{[0, 1].map(indice => <div key={indice} className="h-96 rounded-xl bg-slate-100"/>)}</div></div></main>}><ContenidoEvaluacion params={params}/></Suspense>;
}

function AccesoDenegado({ mensaje }: { mensaje: string }) {
  return <main className="min-h-screen bg-slate-50 p-8 text-slate-900"><h1 className="text-xl font-semibold">{mensaje}</h1><Link href="/evaluator" className="mt-4 inline-block text-blue-700 underline">Volver a entregas disponibles</Link></main>;
}

async function ContenidoEvaluacion({ params }: { params: Promise<{ submissionId: string }> }) {
  await connection();
  const supabase = await createClient();
  const { data: auth, error: errorAuth } = await supabase.auth.getClaims();
  const usuario = auth?.claims?.sub;
  if (errorAuth || typeof usuario !== "string") redirect("/login");
  const { data: perfil, error: errorPerfil } = await supabase.from("profiles").select("display_name, role").eq("id", usuario).maybeSingle();
  if (errorPerfil || (perfil?.role !== "evaluator" && perfil?.role !== "admin")) return <AccesoDenegado mensaje={errorPerfil ? "No pudimos verificar tu acceso" : "No tienes permiso para evaluar"}/>;
  const { submissionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) notFound();
  // Se verifica la asignación antes de recuperar o enviar evidencia al navegador.
  const { data: evaluacion, error: errorEvaluacion } = await supabase.from("evaluations").select("evaluator_id, status").eq("submission_id", submissionId).maybeSingle();
  if (errorEvaluacion) return <AccesoDenegado mensaje="No pudimos verificar la asignación de esta evaluación"/>;
  if (evaluacion && evaluacion.evaluator_id !== usuario && perfil.role !== "admin") return <AccesoDenegado mensaje="Esta evaluación está asignada a otro evaluador"/>;
  const { data: entrega, error: errorEntrega } = await supabase.from("submissions")
    .select("id, user_id, challenge_id, status, github_repo_url, documentation, justification, problem_description, updated_at")
    .eq("id", submissionId).eq("status", "submitted").maybeSingle();
  if (errorEntrega) return <AccesoDenegado mensaje="No pudimos cargar la entrega"/>;
  if (!entrega) notFound();
  const [desafio, estudiante] = await Promise.all([
    supabase.from("challenges").select("title").eq("id", entrega.challenge_id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", entrega.user_id).maybeSingle(),
  ]);
  return <div className={inter.className}><EvaluationPanel key={submissionId} submissionId={submissionId} usuarioId={usuario} nombreEvaluador={perfil.display_name || "Evaluador"} nombreEstudiante={estudiante.data?.display_name || "Nombre no disponible"} tituloDesafio={desafio.data?.title || "Título no disponible"} soloLectura={Boolean(evaluacion && evaluacion.evaluator_id !== usuario)} evidencia={{ repositorio: entrega.github_repo_url, documentacion: entrega.documentation, justificacion: entrega.justification, problema: entrega.problem_description, actualizada: entrega.updated_at }}/></div>;
}
