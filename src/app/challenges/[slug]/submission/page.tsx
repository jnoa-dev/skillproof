
import { LoadingState } from "@/components/ui/loading-state";
import { Suspense } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStudentPage } from "@/lib/auth/student";
import SubmissionForm from "@/components/challenges/submission-form";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function SubmissionPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<EntregaCargando />}><ContenidoEntrega params={params}/></Suspense>;
}

function EntregaCargando() { return <LoadingState fullPage label="Cargando entrega…"/>; }

async function ContenidoEntrega({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const supabase = await createClient();
  const { data: auth, error: errorAuth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (errorAuth || typeof userId !== "string") redirect("/login");
  await requireStudentPage(supabase, userId);

  const rutaDesafio = `/challenges/${encodeURIComponent(slug)}`;
  const { data: challenge, error: errorDesafio } = await supabase.from("challenges")
    .select("id, title").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!errorDesafio && !challenge) notFound();

  const [resultadoEntrega, resultadoPerfil] = await Promise.all([
    challenge ? supabase.from("submissions")
      .select("id, status, github_repo_url, documentation, justification, problem_description")
      .eq("user_id", userId).eq("challenge_id", challenge.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("profiles").select("display_name, role").eq("id", userId).maybeSingle(),
  ]);
  const submission = resultadoEntrega.error ? null : resultadoEntrega.data;
  const enviado = submission?.status === "submitted";
  const draft = submission?.status === "draft" ? submission : null;
  const nombre = resultadoPerfil.data?.display_name?.trim() || "Estudiante";
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((parte: string) => parte[0]).join("").toUpperCase();
  const enlace = "rounded-sm text-[#165dcc] hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-[#f7f9fc] text-[#14263d]`}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1120px] flex-wrap items-center justify-between gap-4 px-6 sm:px-8">
          <div className="flex min-h-16 flex-wrap items-center gap-8"><Link href="/dashboard" className="text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-blue-700">SKILLPROOF</Link>
            <nav aria-label="Navegación del estudiante" className="flex min-h-16 items-stretch gap-6 text-sm font-medium"><Link href="/dashboard" className={`${enlace} flex items-center text-slate-600`}>Dashboard</Link><Link href={rutaDesafio} className={`${enlace} flex items-center text-slate-600`}>Mi desafío</Link><Link href={`${rutaDesafio}/submission`} aria-current="page" className={`${enlace} flex items-center border-b-2 border-[#165dcc] font-semibold`}>Mi entrega</Link></nav>
          </div>
          <Link href="/account" aria-label="Mi cuenta" className="flex items-center gap-3 rounded-lg py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-sm font-semibold">{iniciales}</span><div className="hidden text-sm sm:block"><p className="font-semibold leading-tight">{nombre}</p><p className="text-xs text-slate-500">{resultadoPerfil.data?.role === "admin" ? "Administrador" : resultadoPerfil.data?.role === "evaluator" ? "Evaluador" : "Estudiante"}</p></div></Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[800px] flex-1 space-y-6 px-6 py-8">
        <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-2 text-sm text-slate-500"><Link href="/dashboard" className={enlace}>Dashboard</Link><span aria-hidden="true">›</span><Link href={rutaDesafio} className={enlace}>Mi desafío</Link><span aria-hidden="true">›</span><span>{challenge?.title || "Mi entrega"}</span></nav>
        {errorDesafio || resultadoEntrega.error ? <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"><h1 className="font-semibold">No pudimos cargar tu entrega</h1><p className="mt-2">Vuelve a intentarlo para recuperar los datos antes de editar.</p><a href={`${rutaDesafio}/submission`} className="mt-4 inline-block rounded border border-red-200 bg-white px-4 py-2 focus-visible:outline-2 focus-visible:outline-blue-700">Reintentar</a></section> : challenge && <>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h1 className="text-[32px] leading-tight font-bold">Entrega de Desafío: {challenge.title}</h1><span className={`self-start rounded border px-2.5 py-1 text-xs font-semibold tracking-wider uppercase sm:self-center ${enviado ? "border-green-200 bg-green-50 text-green-800" : "border-slate-300 bg-slate-100"}`}>{enviado ? "Enviado" : draft ? "Borrador" : "Sin iniciar"}</span></div>
          <div className="flex flex-wrap gap-5 text-sm"><Link href={`${rutaDesafio}#requisitos-desafio`} className={enlace}>Ver Requisitos del Desafío</Link><Link href={`${rutaDesafio}#criterios-desafio`} className={enlace}>Consultar Rúbrica Oficial</Link></div>
          {enviado ? <><section role="status" className="rounded-xl border border-green-200 bg-green-50 p-6 text-sm text-green-800"><h2 className="font-semibold">Entrega recibida</h2><p className="mt-1">Tu solución se envió correctamente. Estado: Enviado.</p><Link href="/dashboard" className={`${enlace} mt-3 inline-block`}>Ver estado de mi entrega →</Link><Link href={`${rutaDesafio}/defense`} className={`${enlace} mt-4 block font-semibold`}>Continuar a defensa técnica →</Link></section><section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Tu entrega</h2><span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">Bloqueado</span></div><p className="text-sm text-slate-500">Los datos técnicos registrados están bloqueados para edición.</p><dl className="space-y-5 break-words text-sm">{[["URL del repositorio GitHub", submission.github_repo_url], ["Documentación técnica", submission.documentation], ["Justificación técnica", submission.justification], ["¿Qué problema encontraste y cómo lo investigaste?", submission.problem_description]].map(([etiqueta, valor]) => <div key={etiqueta}><dt className="font-semibold">{etiqueta}</dt><dd className="mt-2"><textarea aria-label={etiqueta || "Dato de entrega"} readOnly rows={etiqueta === "URL del repositorio GitHub" ? 2 : 4} value={valor || "No disponible"} className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-700"/></dd></div>)}</dl></section></> : <SubmissionForm key={challenge.id} challengeId={challenge.id} draft={draft} variante="pagina"/>}
        </>}
      </main>
      <footer className="mt-12 border-t border-slate-200 bg-white py-4 text-sm text-slate-600"><div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-8"><span>© SKILLPROOF</span><div className="flex gap-1"><button type="button" disabled title="Términos aún no está disponible">Términos</button><span aria-hidden="true">·</span><button type="button" disabled title="Soporte aún no está disponible">Soporte</button></div></div></footer>
    </div>
  );
}
