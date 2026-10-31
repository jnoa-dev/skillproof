import { Suspense } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import SubmissionForm from "@/components/challenges/submission-form";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<DesafioCargando />}>
      <ChallengeContent params={params} />
    </Suspense>
  );
}

function DesafioCargando() {
  return (
    <div aria-busy="true" aria-label="Cargando desafío" className={`${inter.className} flex min-h-screen flex-col bg-[#f8f9ff] text-slate-900`}>
      <span role="status" className="sr-only">Cargando desafío...</span>
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-[1200px] items-center gap-10 px-6 sm:px-8"><span className="text-xl font-semibold">SKILLPROOF</span><span aria-hidden="true" className="h-3 w-56 rounded bg-slate-100" /></div></header>
      <main aria-hidden="true" className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8 sm:px-8">
        <div className="carga-animada"><div className="h-3 w-64 max-w-full rounded bg-slate-200"/><div className="mt-4 h-8 w-96 max-w-full rounded bg-slate-300"/><div className="mt-3 h-4 w-72 max-w-full rounded bg-slate-200"/>
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-12"><div className="space-y-6 lg:col-span-8">{[2, 3, 4, 3, 6].map((filas, indice) => <div key={indice} className="rounded-xl border border-slate-200 bg-white p-6"><div className="mb-4 h-5 w-40 max-w-full rounded bg-slate-300"/>{Array.from({length: filas}, (_, fila) => <div key={fila} className={`mt-3 h-3 rounded bg-slate-200 ${fila === filas - 1 ? "w-3/4" : "w-full"}`}/>)}</div>)}</div><div className="space-y-6 lg:col-span-4">{[0, 1].map(indice => <div key={indice} className="rounded-xl border border-slate-200 bg-white p-6"><div className="h-5 w-28 rounded bg-slate-300"/><div className="mt-4 h-3 w-3/4 rounded bg-slate-200"/><div className="mt-3 h-3 w-full rounded bg-slate-200"/><div className="mt-4 h-12 w-full rounded bg-slate-300"/></div>)}</div></div>
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-600"><div className="mx-auto max-w-[1200px]">© SKILLPROOF</div></footer>
    </div>
  );
}

function ErrorDesafio({ ruta }: { ruta: string }) {
  return <div className={`${inter.className} min-h-screen bg-[#f8f9ff] text-slate-900`}><header className="border-b border-slate-200 bg-white px-6 py-5"><div className="mx-auto max-w-[1136px]"><Link href="/dashboard" className="text-xl font-semibold">SKILLPROOF</Link></div></header><main className="mx-auto max-w-[1200px] px-6 py-8 sm:px-8"><div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><div><h1 className="text-sm font-semibold">No pudimos cargar el desafío</h1><p className="mt-1 text-xs">No pudimos completar la acción. Vuelve a intentarlo.</p></div><a href={ruta} className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">↻ Reintentar</a></div><Link href="/dashboard" className="mt-6 inline-block text-sm text-blue-700 underline">Volver al dashboard</Link></main></div>;
}

async function ChallengeContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();

  const { slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (typeof userId !== "string") {
    redirect("/login");
  }

  const { data: challenge, error: errorDesafio } = await supabase
    .from("challenges")
    .select("id, title, description, difficulty, requirements, deliverables")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (errorDesafio) {
    return <ErrorDesafio ruta={`/challenges/${encodeURIComponent(slug)}`} />;
  }

  if (!challenge) {
    notFound();
  }

  const { data: submission, error: errorEntrega } = await supabase
    .from("submissions")
    .select(
      "id, status, github_repo_url, documentation, justification, problem_description, updated_at"
    )
    .eq("user_id", userId)
    .eq("challenge_id", challenge.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const draft = !errorEntrega && submission?.status === "draft" ? submission : null;
  const [perfilResultado, rubricaResultado] = await Promise.all([
    supabase.from("profiles").select("display_name, role").eq("id", userId).maybeSingle(),
    supabase.from("rubric_criteria")
      .select("id, title, description, max_score, weight, position")
      .eq("challenge_id", challenge.id).eq("is_active", true).order("position", { ascending: true }),
  ]);
  const nombre = perfilResultado.data?.display_name?.trim() || "Estudiante";
  const enviado = !errorEntrega && submission?.status === "submitted";
  const fechaBorrador = draft?.updated_at && !Number.isNaN(Date.parse(draft.updated_at))
    ? new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }).format(new Date(draft.updated_at)).replaceAll(".", "") : null;
  const estado = errorEntrega ? "No disponible" : enviado ? "Enviado" : draft ? "Borrador" : "Sin iniciar";
  const rutaDesafio = `/challenges/${encodeURIComponent(slug)}`;
  const tarjeta = "rounded-xl border border-slate-200 bg-white p-6 shadow-sm";
  const titulo = "text-xl leading-7 font-semibold";
  const enlace = "rounded-sm text-[var(--dashboard-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-[var(--dashboard-background)] text-[var(--dashboard-foreground)] [--dashboard-background:#f8f9ff] [--dashboard-primary:#165dcc] [--dashboard-foreground:#14263d] [--dashboard-muted:#536174]`}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 sm:px-8">
          <div className="flex min-h-16 flex-wrap items-center gap-10">
            <Link href="/dashboard" className="text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-blue-700">SKILLPROOF</Link>
            <nav aria-label="Navegación del estudiante" className="flex min-h-16 items-stretch gap-6 text-sm">
              <Link href="/dashboard" className={`${enlace} flex items-center text-slate-600`}>Dashboard</Link>
              <Link href={rutaDesafio} aria-current="page" className={`${enlace} flex items-center border-b-2 border-[var(--dashboard-primary)]`}>Mi desafío</Link>
              <Link href={`${rutaDesafio}/submission`} className={`${enlace} flex items-center text-slate-600`}>Mi entrega</Link>
            </nav>
          </div>
          <Link href="/account" aria-label="Mi cuenta" className="flex items-center gap-3 rounded-lg py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            <div className="hidden text-right text-sm leading-tight sm:block"><p className="font-medium">{nombre}</p><p className="text-xs text-[var(--dashboard-muted)]">{perfilResultado.data?.role === "admin" ? "Administrador" : perfilResultado.data?.role === "evaluator" ? "Evaluador" : "Estudiante"}</p></div>
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-blue-800 text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3Z"/></svg></span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8 sm:px-8">
        {(errorEntrega || rubricaResultado.error || perfilResultado.error) && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><div><p className="text-sm font-semibold">No pudimos cargar toda la información del desafío</p><p className="mt-1 text-xs">Puedes consultar los datos disponibles. Vuelve a intentarlo para cargar la información restante.</p></div><a href={rutaDesafio} className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">↻ Reintentar</a></div>}
        <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-2 text-sm text-[var(--dashboard-muted)]">
          <Link href="/dashboard" className={enlace}>Dashboard</Link><span aria-hidden="true">›</span><Link href={rutaDesafio} className={enlace}>Mi desafío</Link><span aria-hidden="true">›</span><span aria-current="page" className="font-medium text-[var(--dashboard-foreground)]">{challenge.title}</span>
        </nav>
        <h1 className="mt-3 text-[32px] leading-10 font-bold tracking-tight">{challenge.title}</h1>
        <p className="mt-1.5 text-base text-[var(--dashboard-muted)]">{challenge.description}</p>
        <p className="mt-4 text-xs text-[var(--dashboard-muted)]">Dificultad: <span className="font-medium text-[var(--dashboard-foreground)]">{challenge.difficulty || "No disponible"}</span></p>
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <section className={tarjeta} aria-labelledby="objetivo-desafio"><h2 id="objetivo-desafio" className={titulo}>Qué se busca resolver</h2><p className="mt-2 text-base leading-relaxed">{challenge.description || "El objetivo de este desafío aún no está disponible."}</p></section>
            <section className={tarjeta} aria-labelledby="contexto-desafio"><h2 id="contexto-desafio" className={titulo}>Contexto</h2><p className="mt-2 text-base leading-relaxed text-[var(--dashboard-muted)]">No hay contexto adicional publicado para este desafío.</p></section>
            <section className={tarjeta} aria-labelledby="requisitos-desafio">
              <h2 id="requisitos-desafio" className={titulo}>Requisitos</h2>
              {challenge.requirements?.length ? <ul className="mt-4 space-y-3">{challenge.requirements.map((item: string, index: number) => <li key={index} className="flex items-start gap-3 text-base"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--dashboard-primary)]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg></span><span className="pt-1">{item}</span></li>)}</ul> : <p className="mt-3 text-sm text-[var(--dashboard-muted)]">No hay requisitos publicados para este desafío.</p>}
            </section>
            <section className={tarjeta} aria-labelledby="entregables-desafio">
              <h2 id="entregables-desafio" className={titulo}>Entregables</h2>
              {challenge.deliverables?.length ? <ol className="mt-4 space-y-4">{challenge.deliverables.map((item: string, index: number) => <li key={index} className="flex items-start gap-4"><span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold">{index + 1}</span><span className="pt-0.5 text-base font-medium">{item}</span></li>)}</ol> : <p className="mt-3 text-sm text-[var(--dashboard-muted)]">No hay entregables publicados para este desafío.</p>}
            </section>
            <section className={tarjeta} aria-labelledby="materiales-desafio"><h2 id="materiales-desafio" className={titulo}>Materiales</h2><p className="mt-3 text-sm text-[var(--dashboard-muted)]">No hay materiales disponibles.</p></section>
            <section className={`${tarjeta} min-w-0`} aria-labelledby="criterios-desafio">
              <h2 id="criterios-desafio" className={titulo}>Criterios de evaluación</h2>
              {rubricaResultado.error ? <p role="status" className="mt-3 text-sm text-[var(--dashboard-muted)]">No se pudieron cargar los criterios de evaluación.</p> : rubricaResultado.data?.length ? <>
                <p className="mt-1 text-sm text-[var(--dashboard-muted)]">Tu entrega será evaluada con los criterios y puntuaciones de esta rúbrica.</p>
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full border-collapse text-left text-sm"><caption className="sr-only">Rúbrica del desafío</caption><thead className="bg-[var(--dashboard-background)]"><tr><th scope="col" className="p-3 font-semibold">Criterio</th><th scope="col" className="p-3 font-semibold">Descripción</th><th scope="col" className="p-3 font-semibold">Puntuación máxima</th><th scope="col" className="p-3 font-semibold">Peso</th></tr></thead><tbody className="divide-y divide-slate-100">{rubricaResultado.data.map((criterio) => <tr key={criterio.id}><th scope="row" className="p-3 align-top font-medium">{criterio.title}</th><td className="p-3 align-top text-[var(--dashboard-muted)]">{criterio.description || "Sin descripción adicional."}</td><td className="p-3 align-top">{criterio.max_score ?? "No disponible"}</td><td className="p-3 align-top">{criterio.weight ?? "No disponible"}</td></tr>)}</tbody></table></div>
              </> : <p className="mt-3 text-sm text-[var(--dashboard-muted)]">No hay criterios de evaluación disponibles para este desafío.</p>}
            </section>
            <div className={tarjeta}>
              {errorEntrega ? <p id="entrega" role="status" className="text-sm text-[var(--dashboard-muted)]">No pudimos verificar tu entrega. Reintenta antes de editar para recuperar cualquier borrador existente.</p> : enviado ? <p id="entrega" className="rounded-lg bg-green-50 p-4 text-green-900">Ya enviaste tu entrega. Quedó cerrada para edición.</p> : <SubmissionForm challengeId={challenge.id} draft={draft} />}
            </div>
          </div>
          <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:col-span-4">
            <section className={tarjeta} aria-labelledby="resumen-entrega">
              <h2 id="resumen-entrega" className={titulo}>Tu entrega</h2>
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">Estado: <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold tracking-wider text-slate-600 uppercase">{estado}</span></p>
              <p className="mt-4 text-sm text-[var(--dashboard-muted)]">{errorEntrega ? "No pudimos verificar el estado de tu entrega." : enviado ? "Tu solución está pendiente de revisión." : draft ? fechaBorrador ? `Guardaste un borrador el ${fechaBorrador}.` : "Tienes un borrador guardado. Fecha no disponible." : "Prepara tu repositorio, tu documentación y tu justificación."}</p>
              {!errorEntrega && <Link href={`${rutaDesafio}/submission`} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--dashboard-primary)] px-4 text-sm font-semibold text-white shadow-sm transition-[scale,box-shadow] duration-150 hover:shadow-md motion-safe:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">{enviado ? "Ver mi entrega" : draft ? "Continuar borrador" : "Preparar mi entrega"}<span aria-hidden="true">→</span></Link>}
            </section>
            <section className={tarjeta} aria-labelledby="instrucciones-evidencia">
              <h2 id="instrucciones-evidencia" className="text-lg leading-[26px] font-semibold">Instrucciones de evidencia</h2>
              <ul className="mt-4 space-y-2 text-sm">{["El repositorio debe ser público.", "Incluye un README o ADR con tus decisiones.", "La entrega no se puede editar después de enviarla."].map(instruccion => <li key={instruccion} className="flex items-start gap-2.5"><span aria-hidden="true" className="text-teal-700">✓</span><span>{instruccion}</span></li>)}</ul>
              <div className="mt-4 border-t border-slate-200 pt-2"><Link href="#entrega" className={`${enlace} text-sm font-medium`}>Ver instrucciones completas <span aria-hidden="true">↗</span></Link></div>
            </section>
          </aside>
        </div>
      </main>
      <footer className="mt-auto border-t border-slate-200 bg-white"><div className="mx-auto flex min-h-14 max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm text-[var(--dashboard-muted)] sm:px-8"><span>© {2026} SKILLPROOF</span><div className="flex gap-4"><button type="button" disabled title="Términos aún no está disponible" className="cursor-not-allowed">Términos</button><span aria-hidden="true">·</span><button type="button" disabled title="Soporte aún no está disponible" className="cursor-not-allowed">Soporte</button></div></div></footer>
    </div>
  );
}
