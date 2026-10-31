"use client";


import { LoadingState } from "@/components/ui/loading-state";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AccesoEvaluador, ErrorPanelEvaluador, ModalEstadoEvaluador } from "./states";
import { evaluacionEnCurso, filtrarEntregas, nombreCandidato, tituloDesafio, type EntregaPanel, type FiltroEstado, type OrdenPanel } from "@/lib/evaluator/dashboard";

const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-[background-color,transform] motion-safe:active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-40";
const campo = "min-h-12 rounded-lg border border-transparent bg-[#f7f9fc] px-4 text-sm text-[#14263d] focus:border-blue-600 focus:outline-2 focus:outline-blue-100";
const opciones: { id: FiltroEstado; texto: string }[] = [{ id: "pending", texto: "Pendientes" }, { id: "draft", texto: "En revisión" }, { id: "finalized", texto: "Finalizadas" }, { id: "all", texto: "Todas" }];
const ruta = (id: string) => `/evaluator/submissions/${encodeURIComponent(id)}`;
function fecha(valor: string | null) {
  return valor && Number.isFinite(Date.parse(valor)) ? new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }).format(new Date(valor)) : "Fecha no disponible";
}
function Icono({ tipo }: { tipo: "pending" | "draft" | "finalized" }) {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{tipo === "pending" ? <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></> : tipo === "finalized" ? <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></> : <><path d="M4 5h12M4 9h9M4 13h5m3 4 6-6 3 3-6 6-4 1Z"/></>}</svg>;
}
export function CargaDashboardEvaluador({ soloEntregas = false }: { soloEntregas?: boolean }) { return <LoadingState label={soloEntregas ? "Cargando entregas por evaluar…" : "Cargando panel del evaluador…"}/>; }

export default function DashboardEvaluador({ soloEntregas = false }: { soloEntregas?: boolean } = {}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [modalEntrega, setModalEntrega] = useState(parametros.get("estado") === "entrega-no-disponible");
  const [codigoError, setCodigoError] = useState(0);
  const [actualizando, setActualizando] = useState(false);
  const [comprobando, setComprobando] = useState<string | null>(null);
  const [datos, setDatos] = useState<{ filas: EntregaPanel[]; limitado: boolean; avisos: string[] } | null>(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState<FiltroEstado>("all");
  const [busqueda, setBusqueda] = useState("");
  const [desafio, setDesafio] = useState("");
  const [orden, setOrden] = useState<OrdenPanel>("recent");
  const [pagina, setPagina] = useState(1);
  useEffect(() => {
    const controlador = new AbortController();
    async function cargar() {
      try {
        const respuesta = await fetch("/api/evaluator/submissions", { cache: "no-store", signal: controlador.signal });
        const contenido = await respuesta.json();
        if (!respuesta.ok) {
          if (!controlador.signal.aborted) {
            setCodigoError(respuesta.status);
            if (respuesta.status === 401 || respuesta.status === 403) setDatos(null);
          }
          throw new Error(typeof contenido.error === "string" ? contenido.error : "No pudimos cargar tus entregas.");
        }
        if (!Array.isArray(contenido.submissions)) throw new Error("No pudimos interpretar las entregas recibidas.");
        const valido = contenido.submissions.every((fila: EntregaPanel) => fila && typeof fila.id === "string" && /^[0-9a-f-]{36}$/i.test(fila.id) && typeof fila.challenge_id === "string" && [null, "draft", "finalized"].includes(fila.evaluation_status) && typeof fila.own_evaluation === "boolean" && [fila.candidate_name, fila.challenge_title, fila.created_at, fila.updated_at, fila.evaluation_updated_at].every(valor => valor === null || typeof valor === "string"));
        if (!valido) throw new Error("Las entregas recibidas no tienen el formato esperado.");
        if (!controlador.signal.aborted) setDatos({ filas: contenido.submissions, limitado: contenido.limited === true, avisos: Array.isArray(contenido.warnings) ? contenido.warnings.filter((valor: unknown) => typeof valor === "string") : [] });
      } catch (problema) {
        if (!controlador.signal.aborted) setError(problema instanceof Error ? problema.message : "No pudimos conectar. Reintenta.");
      } finally { if (!controlador.signal.aborted) setActualizando(false); }
    }
    void cargar();
    return () => controlador.abort();
  }, [intento]);
  function reintentar() { setError(""); setCodigoError(0); setActualizando(true); setIntento(valor => valor + 1); }
  async function abrirEntrega(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (comprobando) return;
    setComprobando(id);
    try {
      const respuesta = await fetch(`/api/evaluator/evaluations?submissionId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (respuesta.status === 401) { setDatos(null); setCodigoError(401); return; }
      if ([403, 404, 409].includes(respuesta.status)) { setModalEntrega(true); return; }
      if (!respuesta.ok) { setError("No pudimos comprobar el acceso a la entrega. Reintenta antes de abrirla."); return; }
      router.push(ruta(id));
    } catch { setError("No pudimos conectar para abrir la entrega. Reintenta."); }
    finally { setComprobando(null); }
  }
  function volverAlListado() { setModalEntrega(false); router.replace(soloEntregas ? "/evaluator/submissions" : "/evaluator#entregas", { scroll: false }); reintentar(); }
  if (codigoError === 401) return <><ErrorPanelEvaluador contexto={soloEntregas ? "entregas" : "panel"} mensaje="Inicia sesión nuevamente para continuar." alReintentar={reintentar}/><ModalEstadoEvaluador tipo="sesion"/></>;
  if (codigoError === 403) return <AccesoEvaluador incrustado/>;
  if (error && !datos) return <ErrorPanelEvaluador contexto={soloEntregas ? "entregas" : "panel"} mensaje={error} alReintentar={reintentar} reintentando={actualizando}/>;
  if (!datos) return <CargaDashboardEvaluador soloEntregas={soloEntregas}/>;

  const cantidades = { pending: datos.filas.filter(f => !f.evaluation_status).length, draft: datos.filas.filter(f => f.evaluation_status === "draft").length, finalized: datos.filas.filter(f => f.evaluation_status === "finalized").length, all: datos.filas.length };
  const enCurso = evaluacionEnCurso(datos.filas);
  const desafios = [...new Map(datos.filas.map(fila => [fila.challenge_id, tituloDesafio(fila)])).entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  const filtradas = filtrarEntregas(datos.filas, estado, busqueda, desafio, orden);
  const paginas = Math.max(1, Math.ceil(filtradas.length / 6));
  const actual = Math.min(pagina, paginas);
  const visibles = filtradas.slice((actual - 1) * 6, actual * 6);
  function limpiar() { setBusqueda(""); setDesafio(""); setEstado("all"); setPagina(1); }

  return <div className="space-y-8">
    {modalEntrega && <ModalEstadoEvaluador tipo="entrega" alVolver={volverAlListado}/>}
    <div className="flex justify-end"><button type="button" disabled={actualizando} onClick={reintentar} className={`${boton} text-blue-700`}>{actualizando && <span aria-hidden="true" className="size-4 rounded-full border-2 border-blue-600 border-r-transparent motion-safe:animate-spin"/>}{actualizando ? "Actualizando…" : "↻ Actualizar panel"}</button></div>
    {datos.avisos.length > 0 && <section role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>{datos.avisos.join(" ")}</p><button onClick={reintentar} className={`${boton} border border-amber-300 bg-white`}>Reintentar</button></section>}
    {!soloEntregas && <div className="grid gap-6 md:grid-cols-3">{opciones.slice(0, 3).map(({ id, texto }) => <button type="button" key={id} aria-label={`${texto}: ${cantidades[id]} entregas. Filtrar listado`} disabled={actualizando || Boolean(error)} onClick={() => { setEstado(id); setPagina(1); }} className="flex min-h-28 items-center justify-between rounded-xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><div><span className="text-sm text-[#536174]">{texto}</span><p className="mt-1"><strong className="text-[32px] leading-10 font-bold">{cantidades[id]}</strong><span className="ml-2 text-sm text-[#536174]">entregas</span></p></div><span className={`flex size-12 items-center justify-center rounded-full ${id === "pending" ? "bg-blue-50 text-blue-700" : id === "draft" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}><Icono tipo={id as "pending" | "draft" | "finalized"}/></span></button>)}</div>}
    {!soloEntregas && enCurso && <section aria-label="Evaluación en curso" className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-slate-100 border-l-4 border-l-[#165dcc] bg-white p-6 shadow-sm"><div><p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700 uppercase">● Evaluación en curso</p><p className="mt-3 text-sm"><span className="font-medium">{nombreCandidato(enCurso)}</span> · {tituloDesafio(enCurso)} · <span className="text-[#536174]">guardada el {fecha(enCurso.evaluation_updated_at)}</span></p></div><Link href={ruta(enCurso.id)} aria-disabled={Boolean(comprobando || actualizando || error)} onClick={event => { if (actualizando || error) event.preventDefault(); else void abrirEntrega(event, enCurso.id); }} className={`${boton} bg-[#165dcc] text-white hover:bg-blue-800`}>Continuar evaluación <span aria-hidden="true">→</span></Link></section>}
    {error ? <ErrorPanelEvaluador contexto={soloEntregas ? "entregas" : "panel"} parcial mensaje={error} alReintentar={reintentar} reintentando={actualizando}/> : <section id="entregas" aria-label="Entregas por evaluar" className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      {datos.filas.length > 0 && <div className="px-6"><nav aria-label="Filtrar entregas por estado" className="flex flex-wrap gap-6">{opciones.map(({ id, texto }) => <button key={id} type="button" aria-pressed={estado === id} onClick={() => { setEstado(id); setPagina(1); }} className={`min-h-16 border-b-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-700 ${estado === id ? "border-[#165dcc] text-blue-700" : "border-transparent text-[#536174] hover:text-blue-700"}`}>{texto} ({cantidades[id]})</button>)}</nav>
        <div className="flex flex-wrap items-center gap-3 py-5"><label className="relative mr-auto flex min-w-60 flex-1 items-center md:max-w-sm"><span className="sr-only">Buscar por candidato o desafío</span><svg aria-hidden="true" className="absolute left-4 text-slate-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} placeholder="Buscar por candidato o desafío" className={`${campo} w-full pl-11`}/></label><label><span className="sr-only">Filtrar por desafío</span><select className={campo} value={desafio} onChange={e => { setDesafio(e.target.value); setPagina(1); }}><option value="">Todos los desafíos</option>{desafios.map(([id, titulo]) => <option key={id} value={id}>{titulo}</option>)}</select></label><label><span className="sr-only">Ordenar entregas</span><select className={campo} value={orden} onChange={e => { setOrden(e.target.value as OrdenPanel); setPagina(1); }}><option value="recent">Fecha de creación: más reciente</option><option value="oldest">Fecha de creación: más antigua</option><option value="name">Candidato A–Z</option><option value="status">Estado de evaluación</option></select></label></div>
      </div>}
      {!datos.filas.length ? <div role="status" className="px-6 py-16 text-center"><div aria-hidden="true" className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-700"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7V5h6l2 2h10v3M3 7h6l2 2h10l-3 10H2Z"/></svg></div><h2 className="text-xl font-semibold">Aún no hay entregas disponibles.</h2><p className="mt-3 text-sm text-[#536174]">Cuando haya soluciones enviadas disponibles para revisión, aparecerán en esta sección.</p></div> : !visibles.length ? <div role="status" className="px-6 py-16 text-center"><div aria-hidden="true" className="mb-4 text-4xl text-blue-700">⌕</div><h2 className="text-lg font-semibold">No se encontraron entregas que coincidan</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#536174]">{busqueda ? `No hay resultados para «${busqueda}». ` : ""}Prueba ajustando la búsqueda o limpiando los filtros aplicados.</p><button onClick={limpiar} className={`${boton} mt-4 border border-blue-600 text-blue-700`}>Limpiar filtros</button><button type="button" className={`${boton} mt-4 text-blue-700`} onClick={() => { setBusqueda(""); setDesafio(""); setEstado("pending"); setPagina(1); }}>Ver pendientes ({cantidades.pending})</button></div> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Entregas disponibles según los permisos de tu cuenta</caption><thead className="bg-[#f7f9fc] text-[#536174]"><tr>{["Candidato", "Desafío", "Última actualización", ...(soloEntregas ? ["Evaluación asignada a"] : []), "Estado", "Acción"].map(titulo => <th key={titulo} scope="col" className={`px-6 py-4 font-medium ${titulo === "Acción" ? "text-right" : ""}`}>{titulo}</th>)}</tr></thead><tbody>{visibles.map(fila => {
          const finalizada = fila.evaluation_status === "finalized";
          const revision = fila.evaluation_status === "draft";
          const iniciales = fila.candidate_name?.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]).join("").toUpperCase() || "?";
          return <tr key={fila.id} className="hover:bg-slate-50"><td className="px-6 py-5"><div className="flex items-center gap-3"><span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${finalizada ? "bg-emerald-50 text-emerald-700" : revision ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{iniciales}</span><div><p className="font-medium">{nombreCandidato(fila)}</p>{!fila.candidate_name && <p className="mt-1 font-mono text-[10px] text-slate-500">Entrega {fila.id.slice(0, 8)}</p>}</div></div></td><td className="px-6 py-5 text-[#536174]">{tituloDesafio(fila)}</td><td className="whitespace-nowrap px-6 py-5 text-[#536174]">{fecha(fila.updated_at)}</td>{soloEntregas && <td className="px-6 py-5 text-[#536174]">{fila.own_evaluation ? "Tú" : fila.evaluation_status ? <span className="inline-flex items-center gap-2"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Otra persona</span> : "No disponible"}</td>}<td className="px-6 py-5"><span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium tracking-wide uppercase ${finalizada ? "bg-emerald-50 text-emerald-800" : revision ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{finalizada ? "✓ Finalizada" : revision ? "◷ En revisión" : "Sin evaluación visible"}</span></td><td className="px-6 py-5 text-right"><Link href={ruta(fila.id)} aria-disabled={Boolean(comprobando || actualizando)} onClick={event => { if (actualizando) event.preventDefault(); else void abrirEntrega(event, fila.id); }} className={`${boton} whitespace-nowrap ${finalizada || (revision && !fila.own_evaluation) ? "bg-slate-100 hover:bg-slate-200" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>{comprobando === fila.id ? "Comprobando…" : fila.evaluation_status && !fila.own_evaluation ? "Ver (solo lectura)" : finalizada ? "Ver evaluación" : revision ? "Continuar evaluación" : "Evaluar entrega"}</Link></td></tr>;
        })}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6"><p role="status" aria-live="polite" className="text-sm text-[#536174]">Mostrando {(actual - 1) * 6 + 1}–{Math.min(actual * 6, filtradas.length)} de {filtradas.length}</p><nav aria-label="Paginación de entregas" className="flex flex-wrap gap-2"><button type="button" aria-label="Página anterior" disabled={actual === 1} onClick={() => setPagina(actual - 1)} className={`${boton} bg-slate-50`}>‹</button>{Array.from({ length: paginas }, (_, i) => i + 1).filter(n => n === 1 || n === paginas || Math.abs(n - actual) <= 1).map((n, i, lista) => <span key={n} className="inline-flex items-center gap-2">{i > 0 && n - lista[i - 1] > 1 && <span aria-hidden="true">…</span>}<button type="button" aria-label={`Página ${n}`} aria-current={actual === n ? "page" : undefined} onClick={() => setPagina(n)} className={`${boton} ${actual === n ? "bg-[#165dcc] text-white" : "bg-slate-50 hover:bg-slate-100"}`}>{n}</button></span>)}<button type="button" aria-label="Página siguiente" disabled={actual === paginas} onClick={() => setPagina(actual + 1)} className={`${boton} bg-slate-50`}>›</button></nav></div>
      </>}
    </section>}
    <p className="text-xs leading-relaxed text-[#536174]">{datos.limitado ? "Hay más resultados. Se muestran las 100 entregas más recientes disponibles; los filtros y los indicadores corresponden a ese conjunto." : "Se muestran hasta 100 entregas disponibles."} Los estados reflejan las evaluaciones visibles para tu cuenta; «Pendientes» agrupa las entregas sin evaluación visible. Los nombres no autorizados no se muestran.</p>
  </div>;
}
