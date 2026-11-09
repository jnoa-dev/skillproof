import { connection } from "next/server";
import Link from "next/link";
import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardForRole } from "@/lib/auth/dashboard";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default async function DashboardPage() {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", userId)
    .maybeSingle();

  const destino = dashboardForRole(profile?.role);
  if (destino && destino !== "/dashboard") redirect(destino);
  if (profileError || !destino) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section role="alert" className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold">No pudimos verificar tu perfil</h1><p className="mt-3 text-slate-600">Necesitamos confirmar tu rol para abrir el panel correcto.</p><Link href="/dashboard" className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 text-white">Reintentar</Link></section></main>;

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, slug, title, description, difficulty, requirements")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let submission: { id: string; status: string; updated_at: string | null } | null = null;

  if (challenge) {
    const { data: latestSubmission } = await supabase
      .from("submissions")
      .select("id, status, updated_at")
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    submission = latestSubmission;
  }

  // Solo se consulta la evaluación de una entrega obtenida con el filtro del usuario actual.
  // No se solicitan notas internas ni se equipara finalización con publicación.
  let estadoEvaluacion: string | null = null;
  let errorEvaluacion = false;
  if (submission?.status === "submitted") {
    const { data: evaluacion, error } = await supabase
      .from("evaluations")
      .select("status")
      .eq("submission_id", submission.id)
      .maybeSingle();
    errorEvaluacion = Boolean(error);
    estadoEvaluacion = error ? null : evaluacion?.status ?? null;
  }

  const nombre = profile?.display_name?.trim() || "Estudiante";
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((parte: string) => parte[0]).join("").toUpperCase();
  const borrador = submission?.status === "draft";
  const enviado = submission?.status === "submitted";
  const evaluado = enviado && estadoEvaluacion === "finalized";
  const enRevision = enviado && estadoEvaluacion === "draft";
  const etapaActual = evaluado ? 3 : enRevision ? 2 : enviado ? 1 : borrador ? 0 : -1;
  const estado = evaluado ? "Evaluado" : enRevision ? "En revisión" : borrador ? "Borrador" : enviado ? "Enviado" : "Sin iniciar";
  const fecha = submission?.updated_at && !Number.isNaN(Date.parse(submission.updated_at))
    ? new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }).format(new Date(submission.updated_at)).replaceAll(".", "")
    : null;
  const rutaDesafio = challenge ? `/challenges/${challenge.slug}` : null;
  const accion = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-[scale,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 motion-safe:active:scale-[0.97] motion-reduce:transition-none";

  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-[var(--dashboard-background)] text-[var(--dashboard-foreground)] [--dashboard-background:#f8f9ff] [--dashboard-primary:#165dcc] [--dashboard-foreground:#14263d] [--dashboard-muted:#536174]`}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 sm:px-8">
          <div className="flex min-h-16 flex-wrap items-center gap-8">
            <Link href="/dashboard" className="text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-blue-700">SKILLPROOF</Link>
            <nav aria-label="Navegación del estudiante" className="flex min-h-16 items-stretch gap-6 text-sm">
              <Link aria-current="page" href="/dashboard" className="flex items-center border-b-2 border-[var(--dashboard-primary)] text-[var(--dashboard-primary)]">Dashboard</Link>
              {rutaDesafio ? <><Link href={rutaDesafio} className="flex items-center hover:text-blue-700">Mi desafío</Link><Link href={`${rutaDesafio}/submission`} className="flex items-center hover:text-blue-700">Mi entrega</Link></> : <><span aria-disabled="true" className="self-center text-slate-400">Mi desafío</span><span aria-disabled="true" className="self-center text-slate-400">Mi entrega</span></>}
            </nav>
          </div>
          <Link href="/account" aria-label="Mi cuenta" className="flex items-center gap-2 rounded-lg py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            <div className="hidden text-right text-sm leading-tight sm:block"><p className="font-medium">{nombre}</p><p className="text-xs text-[var(--dashboard-muted)]">{profile?.role === "admin" ? "Administrador" : profile?.role === "evaluator" ? "Evaluador" : "Estudiante"}</p></div>
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[var(--dashboard-primary)]">{iniciales}</span>
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-[var(--dashboard-primary)] text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3Z"/></svg></span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8 sm:px-8">
        <h1 className="text-[32px] leading-10 font-bold tracking-tight">Hola, {nombre.split(/\s+/)[0]}</h1>
        <p className="mt-1 text-base text-[var(--dashboard-muted)]">Aquí puedes ver el estado de tu desafío y qué sigue.</p>
        {challengeError && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-white p-6 text-red-700">No se pudo cargar el desafío. Revisa la configuración de Supabase.</p>}
        {!challengeError && !challenge && <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Tu desafío</h2><p className="mt-3 text-[var(--dashboard-muted)]">Todavía no hay desafíos activos.</p></section>}
        {challenge && rutaDesafio && <>
          <section aria-labelledby="proxima-accion" className="mt-6 rounded-xl border border-slate-200 border-l-4 border-l-[var(--dashboard-primary)] bg-white p-6">
            <p className="text-xs font-semibold tracking-wider text-[var(--dashboard-muted)] uppercase">Tu próxima acción</p>
            <h2 id="proxima-accion" className="my-2 text-2xl font-semibold">{evaluado ? "Tu evaluación ha finalizado" : enRevision ? "Tu solución está en revisión" : borrador ? "Continúa tu borrador" : enviado ? "Tu solución fue enviada" : "Comienza tu desafío"}</h2>
            <p className="mb-5 text-base leading-relaxed">{borrador ? `${fecha ? `Guardaste un borrador el ${fecha}. ` : ""}Completa los campos y envía tu solución cuando estés listo.` : evaluado ? "La evaluación de tu entrega ha finalizado. La publicación del feedback no está disponible en este panel." : enRevision ? "Tu entrega tiene una evaluación en curso. Puedes consultar tu solución mientras continúa la revisión." : enviado ? "Tu entrega quedó cerrada para edición. Puedes consultar el detalle de tu desafío." : "Revisa los requisitos del desafío y prepara tu solución."}</p>
            <Link href={`${rutaDesafio}/submission`} className={`${accion} bg-[var(--dashboard-primary)] text-white hover:shadow-md`}>{borrador ? "Continuar borrador" : enviado ? "Ver mi entrega" : "Preparar mi entrega"}<span aria-hidden="true">→</span></Link>
          </section>
          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <section aria-labelledby="titulo-desafio" className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
              <div className="flex items-start justify-between gap-4"><h2 id="titulo-desafio" className="text-xl leading-7 font-semibold">{challenge.title}</h2><span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium tracking-wider text-slate-600 uppercase">{estado}</span></div>
              <span className="sr-only">Dificultad: {challenge.difficulty}</span>
              <p className="mt-3 text-base leading-relaxed">{challenge.description}</p>
              <h3 className="mt-5 text-sm font-semibold">Requisitos clave</h3>
              {Array.isArray(challenge.requirements) && challenge.requirements.length ? <ul className="mt-3 mb-6 space-y-3">{challenge.requirements.map((requisito: string, indice: number) => <li key={indice} className="flex items-start gap-2 text-sm"><span aria-hidden="true" className="font-semibold text-[var(--dashboard-primary)]">{indice === 0 ? "‹›" : indice === 1 ? "▤" : "⚑"}</span><span>{requisito}</span></li>)}</ul> : <p className="mt-3 mb-6 text-sm text-[var(--dashboard-muted)]">No hay requisitos publicados para este desafío.</p>}
              <Link href={rutaDesafio} className={`${accion} border border-[var(--dashboard-primary)] text-[var(--dashboard-primary)] hover:bg-blue-50`}>Ver detalle del desafío <span aria-hidden="true">→</span></Link>
            </section>
            <section aria-labelledby="mi-progreso" className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
              <div className="mb-5 flex items-center justify-between gap-3"><h2 id="mi-progreso" className="text-xl font-semibold">Mi progreso</h2><span className="text-xs text-[var(--dashboard-muted)]">{evaluado ? "4/4 completado" : etapaActual < 0 ? "0 de 4 etapas" : `Fase ${etapaActual + 1} de 4`}</span></div>
              <ol>{["Borrador", "Enviado", "En revisión", "Evaluado"].map((paso, indice) => {
                const actual = indice === etapaActual;
                const completado = indice < etapaActual || evaluado;
                return <li key={paso} aria-current={actual ? "step" : undefined} className={`relative flex gap-4 ${indice < 3 ? "pb-6" : ""}`}>
                  {indice < 3 && <span aria-hidden="true" className="absolute top-6 bottom-0 left-[11px] w-px bg-slate-200"/>}
                  <span aria-hidden="true" className={`relative flex size-6 shrink-0 items-center justify-center rounded-full border ${completado ? "border-teal-700 bg-teal-700 text-white" : actual ? "border-[var(--dashboard-primary)] bg-[var(--dashboard-primary)]" : "border-slate-200 bg-white"}`}>{completado ? <span>✓</span> : actual ? <span className="size-2 rounded-full bg-white"/> : null}</span>
                  <div><p className={`text-base leading-6 ${actual ? "font-medium" : "text-[var(--dashboard-muted)]"}`}>{paso}</p>{actual && !evaluado && <p className="text-sm text-[var(--dashboard-primary)]">Estás aquí</p>}</div>
                </li>;
              })}</ol>
              {evaluado && <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="text-sm font-semibold">Pasaporte público</h3><p className="mt-2 text-xs leading-relaxed text-[var(--dashboard-muted)]">Si ya tienes un enlace o código de pasaporte publicado, puedes consultarlo aquí.</p><Link href="/passport" className="mt-3 inline-block rounded text-sm text-blue-700 underline focus-visible:outline-2 focus-visible:outline-blue-700">Consultar pasaporte público →</Link></div>}
              <div className="my-6 border-t border-slate-200"/>
              <h3 className="mb-3 text-lg">Actualizaciones</h3>
              <p className="text-sm leading-5 text-[var(--dashboard-muted)]">{submission ? `${borrador ? "Borrador guardado" : "Entrega actualizada"}${fecha ? ` · ${fecha}` : " · Fecha no disponible"}` : "Todavía no hay actualizaciones de tu entrega."}</p>
              {errorEvaluacion && <p role="status" className="mt-3 text-sm text-amber-800">No pudimos verificar el estado de tu evaluación. <Link href="/dashboard" className="underline">Reintentar</Link></p>}
              <p className="mt-4 flex items-start gap-1 text-sm leading-tight text-[var(--dashboard-muted)]"><span aria-hidden="true">ⓘ</span>El feedback aún no está disponible en este panel.</p>
            </section>
          </div>
        </>}
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-[var(--dashboard-muted)]"><div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 sm:px-8"><span>© {2026} SKILLPROOF</span><div className="flex gap-1"><button type="button" disabled title="Términos aún no está disponible" className="cursor-not-allowed">Términos</button><span aria-hidden="true">·</span><button type="button" disabled title="Soporte aún no está disponible" className="cursor-not-allowed">Soporte</button></div></div></footer>
    </div>
  );
}
