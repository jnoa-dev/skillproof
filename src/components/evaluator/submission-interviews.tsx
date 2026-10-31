"use client";


import { LoadingState } from "@/components/ui/loading-state";
import { useEffect, useRef, useState } from "react";
import { enlacePublico } from "@/lib/passport/datos";

export type Entrevista = { id: string; status: "draft" | "finalized"; understanding_score: number | null; adaptation_score: number | null; evidence: string; created_at: string; finalized_at: string | null; own: boolean; reviewer_name: string | null; response: string | null };
const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-shadow hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50";
const fecha = (valor: string | null) => valor && Number.isFinite(Date.parse(valor)) ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(valor)) : "Fecha no disponible";
const puntaje = (valor: unknown) => valor === null || (typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= 5);
export function entrevistaValida(fila: Entrevista) {
  return fila && typeof fila.id === "string" && ["draft", "finalized"].includes(fila.status) && typeof fila.own === "boolean" && typeof fila.evidence === "string" && typeof fila.created_at === "string" && puntaje(fila.understanding_score) && puntaje(fila.adaptation_score) && (fila.reviewer_name === null || typeof fila.reviewer_name === "string") && (fila.response === null || typeof fila.response === "string") && (fila.finalized_at === null || typeof fila.finalized_at === "string");
}

export default function EntrevistasEntrega({ submissionId, nombreEstudiante, tituloDesafio, repositorio, registrar, alCerrarRegistro, alContar }: { submissionId: string; nombreEstudiante: string; tituloDesafio?: string; repositorio?: string | null; registrar: boolean; alCerrarRegistro: () => void; alContar: (total: number) => void }) {
  const [entrevistas, setEntrevistas] = useState<Entrevista[] | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [aviso, setAviso] = useState("");
  const [intento, setIntento] = useState(0);
  const [abierta, setAbierta] = useState<Entrevista | "nueva" | null>(null);
  useEffect(() => {
    const controlador = new AbortController();
    async function cargar() {
      try {
        const respuesta = await fetch(`/api/evaluator/interviews?submissionId=${encodeURIComponent(submissionId)}`, { cache: "no-store", signal: controlador.signal });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(typeof datos.error === "string" ? datos.error : "No pudimos cargar las entrevistas.");
        if (!Array.isArray(datos.interviews) || !datos.interviews.every(entrevistaValida)) throw new Error("No pudimos interpretar el historial recibido.");
        if (!controlador.signal.aborted) {
          setEntrevistas(datos.interviews); alContar(datos.interviews.length);
          setAviso([...(datos.limited ? ["Se muestran las 100 entrevistas más recientes visibles."] : []), ...(Array.isArray(datos.warnings) ? datos.warnings.filter((valor: unknown) => typeof valor === "string") : [])].join(" "));
        }
      } catch (problema) { if (!controlador.signal.aborted) setError(problema instanceof Error ? problema.message : "No pudimos conectar."); }
    }
    void cargar();
    return () => controlador.abort();
  }, [submissionId, intento, alContar]);
  function recargar() { setError(""); setEntrevistas(null); setIntento(valor => valor + 1); }
  const propia = entrevistas?.find(fila => fila.own);
  const urlRepositorio = enlacePublico(repositorio);
  const iniciales = nombreEstudiante.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join("").toUpperCase();
  const seleccion = registrar ? propia || "nueva" : abierta;
  function cerrar() { setAbierta(null); alCerrarRegistro(); }
  return <section aria-labelledby="entrevistas-asociadas" className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 id="entrevistas-asociadas" className="text-xl font-semibold">Entrevistas técnicas asociadas</h2><p className="mt-2 text-sm text-slate-600">Registro y seguimiento de entrevistas técnicas y defensa de código.</p></div><button type="button" disabled={!entrevistas || Boolean(error)} onClick={() => setAbierta(propia || "nueva")} className={`${boton} border-transparent bg-[#165dcc] text-white`}>{propia ? "Abrir mi entrevista" : "+ Registrar entrevista"}</button></div>
    {mensaje && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{mensaje}</p>}
    {aviso && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{aviso}</p>}
    {error ? <section role="alert" className="rounded-xl border border-red-200 bg-white p-6"><h3 className="font-semibold">No pudimos cargar las entrevistas</h3><p className="mt-2 text-sm text-red-700">{error}</p><button type="button" onClick={recargar} className={`${boton} mt-4 border-blue-600 text-blue-700`}>Reintentar</button></section> : !entrevistas ? <LoadingState compact label="Cargando entrevistas…"/> : !entrevistas.length ? <section aria-labelledby="entrevistas-vacias" className="rounded-xl border border-slate-100 bg-white px-6 py-14 text-center shadow-sm sm:px-10 sm:py-16">
      <div aria-hidden="true" className="mx-auto flex size-20 items-center justify-center rounded-full bg-blue-50 text-blue-800 shadow-sm"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V4H3v13l4-4h11Z"/><path d="M7 17h10l4 4V8"/></svg></div>
      <h3 id="entrevistas-vacias" className="mt-6 text-2xl font-semibold leading-8">Aún no registras una entrevista con esta persona.</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#536174]">Las entrevistas permiten registrar evidencias cualitativas directas y aclaraciones de diseño con el postulante para complementar la rúbrica técnica.</p>
      <button type="button" onClick={() => setAbierta("nueva")} className={`${boton} mt-7 border-transparent bg-[#165dcc] px-6 text-white`}>+ Registrar entrevista</button>
      <div className="mx-auto mt-9 flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-3 border-t border-slate-100 pt-5 text-xs text-[#536174]"><span>Borradores editables</span><span>Entrevistas finalizadas de solo lectura</span><span>Acceso según permisos</span></div>
    </section> : entrevistas.map(fila => <article key={fila.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold">Entrevista registrada el {fecha(fila.created_at)}</h3><span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${fila.status === "finalized" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{fila.status === "finalized" ? "✓ Finalizada" : "Borrador"}</span></div><button type="button" onClick={() => setAbierta(fila)} className={`${boton} border-slate-300`}>Abrir entrevista ↗</button></div><div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600"><p>Entrevistador: <strong className="font-medium text-[#14263d]">{fila.reviewer_name || "Nombre no disponible"}{fila.own ? " (tú)" : ""}</strong></p><p>{fila.status === "finalized" ? `Finalizada el ${fecha(fila.finalized_at)}` : "Pendiente de finalizar"}</p><p className={fila.response ? "text-emerald-800" : "text-slate-500"}>{fila.response ? "✓ Respuesta del candidato recibida" : "Sin respuesta visible del candidato"}</p></div><p className="mt-5 line-clamp-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">{fila.evidence || "Sin observaciones guardadas."}</p></article>)}
    {entrevistas && !error && <aside aria-label="Contexto del candidato" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-[#eff3ff] p-5"><div className="flex min-w-0 items-center gap-4"><span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-lg font-semibold text-blue-800">{iniciales}</span><div className="min-w-0"><p className="font-semibold">{nombreEstudiante}</p><p className="mt-1 break-words text-sm text-[#536174]">{tituloDesafio || "Entrega técnica seleccionada"}</p></div></div>{urlRepositorio && <a href={urlRepositorio} target="_blank" rel="noopener noreferrer" className={`${boton} border-slate-200 bg-white text-blue-700`}>Abrir repositorio ↗</a>}</aside>}
    <p className="rounded-lg border border-slate-100 bg-white p-5 text-sm leading-relaxed text-slate-600">Las entrevistas complementan la evaluación técnica y no sobrescriben la rúbrica. Solo se muestra el historial que tus permisos permiten consultar.</p>
    {entrevistas && seleccion && <EditorEntrevista key={seleccion === "nueva" ? "nueva" : seleccion.id} entrevista={seleccion === "nueva" ? null : seleccion} submissionId={submissionId} nombreEstudiante={nombreEstudiante} alCerrar={cerrar} alGuardar={finalizada => { setMensaje(finalizada ? "Entrevista finalizada. Ahora es de solo lectura." : "Borrador de entrevista guardado."); cerrar(); recargar(); }}/>} 
  </section>;
}

export function EditorEntrevista({ entrevista, submissionId, nombreEstudiante, alCerrar, alGuardar, inline = false }: { entrevista: Entrevista | null; submissionId: string; nombreEstudiante: string; alCerrar: () => void; alGuardar: (finalizada: boolean) => void; inline?: boolean }) {
  const modal = useRef<HTMLDialogElement>(null);
  const pendiente = useRef(false);
  const [comprension, setComprension] = useState<number | null>(entrevista?.understanding_score ?? null);
  const [adaptacion, setAdaptacion] = useState<number | null>(entrevista?.adaptation_score ?? null);
  const [evidencia, setEvidencia] = useState(entrevista?.evidence || "");
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [bloqueada, setBloqueada] = useState(false);
  const lectura = Boolean(entrevista && (!entrevista.own || entrevista.status === "finalized")) || bloqueada;
  const modificada = comprension !== (entrevista?.understanding_score ?? null) || adaptacion !== (entrevista?.adaptation_score ?? null) || evidencia !== (entrevista?.evidence || "");
  useEffect(() => { if (inline) return; const nodo = modal.current; nodo?.showModal(); return () => { if (nodo?.open) nodo.close(); }; }, [inline]);
  useEffect(() => { if (!modificada || lectura) return; const avisar = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", avisar); return () => window.removeEventListener("beforeunload", avisar); }, [modificada, lectura]);
  function cerrar() { if (!guardando && (!modificada || lectura || window.confirm("Hay cambios sin guardar. ¿Quieres cerrar la entrevista?"))) alCerrar(); }
  async function guardar(accion: "draft" | "finalize") {
    if (pendiente.current || lectura) return;
    if (accion === "finalize" && (comprension === null || adaptacion === null || evidencia.trim().length < 20)) { setConfirmando(false); setError("Completa ambos puntajes y escribe al menos 20 caracteres de evidencia para finalizar."); return; }
    pendiente.current = true; setGuardando(true); setError("");
    try {
      const respuesta = await fetch("/api/evaluator/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId, action: accion, understandingScore: comprension, adaptationScore: adaptacion, evidence: evidencia }) });
      const datos = await respuesta.json();
      if (!respuesta.ok) { if ([401, 403, 409].includes(respuesta.status)) setBloqueada(true); throw new Error(typeof datos.error === "string" ? datos.error : "No pudimos guardar la entrevista."); }
      if (!datos.interview || datos.interview.status !== (accion === "finalize" ? "finalized" : "draft")) throw new Error("No pudimos confirmar el estado guardado. Consulta el historial antes de reintentar.");
      alGuardar(accion === "finalize");
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No pudimos conectar. Tus observaciones siguen en el formulario."); setConfirmando(false); }
    finally { pendiente.current = false; setGuardando(false); }
  }
  const content = <><div className="flex items-start justify-between gap-4"><div><h2 id="titulo-editor-entrevista" className="text-xl font-semibold">{confirmando ? "¿Finalizar la entrevista?" : lectura ? "Consultar entrevista técnica" : "Registrar entrevista técnica"}</h2><p className="mt-2 text-sm text-slate-600">Candidato: {nombreEstudiante}</p></div><button type="button" aria-label="Cerrar entrevista" disabled={guardando} onClick={cerrar} className="rounded p-2 focus-visible:outline-2 focus-visible:outline-blue-700">✕</button></div>
    {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {confirmando ? <div><p className="mt-6 text-sm leading-relaxed">Después de finalizar no podrás editar los puntajes ni la evidencia. El candidato podrá consultar la entrevista finalizada según los permisos de la plataforma.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={guardando} onClick={() => setConfirmando(false)} className={`${boton} border-slate-300`}>Cancelar</button><button type="button" disabled={guardando} onClick={() => void guardar("finalize")} className={`${boton} border-transparent bg-[#165dcc] text-white`}>{guardando ? "Finalizando…" : "Finalizar"}</button></div></div> : <form onSubmit={event => { event.preventDefault(); void guardar("draft"); }}><fieldset disabled={lectura || guardando} className="mt-6 space-y-5">{[{ titulo: "Comprensión de su solución", ayuda: "¿Explica con claridad por qué tomó sus decisiones?", valor: comprension, cambiar: setComprension }, { titulo: "Capacidad de adaptación", ayuda: "¿Pudo ajustar su solución ante un cambio de requisito?", valor: adaptacion, cambiar: setAdaptacion }].map(campo => <fieldset key={campo.titulo} className="rounded-lg border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold">{campo.titulo}</legend><p className="text-xs text-slate-600">{campo.ayuda}</p><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={campo.titulo}>{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-pressed={campo.valor === n} onClick={() => campo.cambiar(n)} className={`${boton} ${campo.valor === n ? "border-blue-600 bg-blue-700 text-white" : "border-slate-300"}`}>{n}</button>)}</div><p className="mt-2 text-xs text-slate-500">1 = Muy bajo · 5 = Excelente{lectura && campo.valor === null ? " · Sin puntaje" : ""}</p></fieldset>)}<label className="block text-sm font-semibold">Evidencia y observaciones<textarea rows={6} maxLength={10000} value={evidencia} onChange={event => setEvidencia(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm font-normal leading-relaxed focus:outline-2 focus:outline-blue-700 disabled:bg-slate-50"/><span className="mt-2 flex justify-between gap-3 text-xs font-normal text-slate-500"><span>Describe hechos concretos. Mínimo 20 caracteres para finalizar.</span><span>{evidencia.length} / 10 000</span></span></label></fieldset>
      {lectura && entrevista?.response && <section className="mt-6 rounded-lg border-l-4 border-l-blue-600 bg-slate-50 p-4"><h3 className="text-sm font-semibold">Respuesta del candidato</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{entrevista.response}</p></section>}
      {!lectura && <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5"><button type="submit" disabled={guardando} className={`${boton} border-blue-600 text-blue-700`}>{guardando ? "Guardando…" : "Guardar borrador"}</button><button type="button" disabled={guardando} onClick={() => { if (comprension === null || adaptacion === null || evidencia.trim().length < 20) setError("Completa ambos puntajes y escribe al menos 20 caracteres de evidencia para finalizar."); else setConfirmando(true); }} className={`${boton} border-transparent bg-[#165dcc] text-white`}>Finalizar entrevista</button></div>}
      {lectura && <p className="mt-5 text-xs text-slate-500">Solo lectura. Las entrevistas finalizadas y las de otra persona no se pueden editar desde esta cuenta.</p>}
    </form>}
  </>;
  return inline ? <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{content}</section> : <dialog ref={modal} aria-labelledby="titulo-editor-entrevista" onCancel={event => { event.preventDefault(); cerrar(); }} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_3rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 text-[#14263d] shadow-xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm">{content}</dialog>;
}
