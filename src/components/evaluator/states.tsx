"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export const accionEstado = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-[transform,box-shadow] hover:shadow-md motion-safe:active:scale-[0.98] motion-reduce:transition-none";

export function IconoEstado({ bloqueo = false }: { bloqueo?: boolean }) {
  return <div aria-hidden="true" className={`mx-auto flex size-16 items-center justify-center rounded-full ${bloqueo ? "bg-blue-50 text-slate-700" : "bg-red-50 text-red-700"}`}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{bloqueo ? <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></> : <><path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3h.01"/></>}</svg></div>;
}

export function AccesoEvaluador({ error = false, rol, incrustado = false }: { error?: boolean; rol?: string; incrustado?: boolean }) {
  const Contenedor = incrustado ? "section" : "main";
  return <Contenedor className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-6 py-12 text-[#14263d]"><section aria-labelledby="titulo-acceso-evaluador" className={`w-full max-w-2xl overflow-hidden rounded-xl border border-slate-100 bg-white px-8 py-12 text-center shadow-sm ${error ? "" : "border-t-4 border-t-blue-600"}`}><IconoEstado bloqueo/>
    <p className="mt-6 text-xs font-medium tracking-wider uppercase">{error ? "Error de autenticación" : "Acceso denegado"}</p><h1 id="titulo-acceso-evaluador" className="mt-3 text-2xl font-bold leading-8">{error ? "No pudimos verificar tu acceso" : "No tienes permiso para acceder al panel del evaluador"}</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#536174]">{error ? "Vuelve a intentarlo más tarde o regresa a tu dashboard. Si el problema persiste, contacta al administrador de la plataforma." : "Este apartado está disponible para cuentas con rol de evaluador o administrador. Si consideras que esto es un error, contacta al administrador de la plataforma."}</p>
    {!error && rol && <p className="mt-6 rounded-lg bg-blue-50 p-4 text-sm">Perfil actual: <strong>{rol === "student" ? "Estudiante" : "Rol no autorizado"}</strong></p>}
    <div className="mt-8 flex flex-wrap justify-center gap-3">{error && <button type="button" onClick={() => window.location.reload()} className={`${accionEstado} bg-[#165dcc] text-white`}>↻ Reintentar</button>}<Link href="/dashboard" className={`${accionEstado} ${error ? "border border-slate-200" : "bg-[#165dcc] text-white"}`}>← Volver al dashboard</Link></div>
  </section></Contenedor>;
}

export function ModalEstadoEvaluador({ tipo, alVolver }: { tipo: "sesion" | "entrega"; alVolver?: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const nodo = dialogo.current;
    if (nodo && !nodo.open) nodo.showModal();
    return () => { if (nodo?.open) nodo.close(); };
  }, []);
  const sesion = tipo === "sesion";
  return <dialog ref={dialogo} aria-labelledby="titulo-estado-evaluador" aria-describedby="descripcion-estado-evaluador" onCancel={event => event.preventDefault()} className="fixed inset-0 m-auto w-[calc(100%_-_3rem)] max-w-xl rounded-xl border border-slate-200 bg-white p-7 text-[#14263d] shadow-xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm"><div className="text-center"><IconoEstado bloqueo={sesion}/></div><p className="mt-5 text-xs font-semibold tracking-wide uppercase">{sesion ? "Sesión interrumpida" : "Estado de la entrega"}</p><h2 id="titulo-estado-evaluador" className="mt-2 text-2xl font-bold">{sesion ? "Tu sesión ha caducado" : "Esta entrega ya no está disponible para ti."}</h2><p id="descripcion-estado-evaluador" className="mt-4 text-sm leading-6 text-[#536174]">{sesion ? "Inicia sesión nuevamente para continuar. Solo los cambios cuyo guardado fue confirmado están registrados en el servidor." : "No pudimos abrir esta entrega con tus permisos actuales. Puede haber cambiado su disponibilidad. Vuelve al listado para actualizar la información."}</p><div className="mt-7 flex flex-wrap gap-3">{sesion ? <><Link autoFocus href="/login" className={`${accionEstado} w-full bg-[#165dcc] text-white`}>Iniciar sesión</Link><Link href="/" className={`${accionEstado} w-full border border-slate-200`}>← Ir al inicio</Link></> : <button autoFocus type="button" onClick={alVolver} className={`${accionEstado} w-full bg-[#165dcc] text-white`}>Volver a Entregas por evaluar →</button>}</div></dialog>;
}

export function ErrorPanelEvaluador({ mensaje, parcial = false, reintentando = false, alReintentar, contexto = "panel" }: { mensaje: string; parcial?: boolean; reintentando?: boolean; alReintentar: () => void; contexto?: "panel" | "entregas" }) {
  return <section role="alert" className={`rounded-xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm ${parcial ? "border-t-4 border-t-red-600" : ""}`}><IconoEstado/><h2 className="mt-6 text-xl font-bold">{parcial ? "No pudimos actualizar: entregas por evaluar" : contexto === "entregas" ? "No pudimos cargar la información de las entregas" : "No pudimos cargar la información del panel"}</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#536174]">{mensaje}</p>{parcial && <p className="mt-3 text-xs text-amber-800">Los indicadores visibles corresponden a la última carga correcta y pueden haber cambiado.</p>}<button type="button" disabled={reintentando} onClick={alReintentar} className={`${accionEstado} mt-7 bg-[#165dcc] text-white disabled:opacity-50`}>{reintentando && <span aria-hidden="true" className="size-4 rounded-full border-2 border-white border-r-transparent motion-safe:animate-spin"/>}{reintentando ? "Actualizando…" : "↻ Reintentar"}</button></section>;
}
