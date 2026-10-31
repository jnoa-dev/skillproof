"use client";


import { LoadingState } from "@/components/ui/loading-state";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adaptarPasaporte, registro } from "@/lib/passport/datos";
import { CopiarEnlace } from "./acciones";

type Pasaporte = ReturnType<typeof adaptarPasaporte>;
type Resultado = { tipo: "cargando" } | { tipo: "listo"; datos: Pasaporte } | { tipo: "invalido" | "privado" | "error" | "formato" };

export default function VistaPasaporte({ slug }: { slug: string }) {
  const slugValido = slug.length <= 200 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  const [resultado, setResultado] = useState<Resultado>({ tipo: slugValido ? "cargando" : "invalido" });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!slugValido) return;
    const controlador = new AbortController();
    async function consultar() {
      try {
        const respuesta = await fetch(`/api/passport/${encodeURIComponent(slug)}`, { cache: "no-store", signal: controlador.signal });
        if (controlador.signal.aborted) return;
        if (respuesta.status === 404) { setResultado({ tipo: "privado" }); return; }
        if (!respuesta.ok) { setResultado({ tipo: "error" }); return; }
        const contenido: unknown = await respuesta.json();
        const datos = adaptarPasaporte(registro(contenido).passport);
        if (!controlador.signal.aborted) setResultado(datos.nombre || datos.desafio ? { tipo: "listo", datos } : { tipo: "formato" });
      } catch { if (!controlador.signal.aborted) setResultado({ tipo: "error" }); }
    }
    void consultar();
    return () => controlador.abort();
  }, [slug, slugValido, intento]);
  const tarjeta = "rounded-xl border border-slate-200 bg-white p-5 sm:p-6";
  const titulo = "text-xl font-semibold text-[#14263d]";
  const vacio = "Información no disponible en el pasaporte público.";
  const datos = resultado.tipo === "listo" ? resultado.datos : null;
  const evidenciaDisponible = Boolean(datos?.repositorio || datos?.documentacion);
  const fecha = datos?.fecha && !Number.isNaN(Date.parse(datos.fecha))
    ? new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Lima" }).format(new Date(datos.fecha)) : null;

  return <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-[#17212f]">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 px-6 sm:px-8"><Link href="/passport" className="text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-700">SKILLPROOF</Link><span className="text-xs text-slate-500">Pasaporte de competencias</span></div></header>
    <main className="mx-auto w-full max-w-[1120px] flex-1 space-y-6 px-6 py-6 sm:px-8">
      {resultado.tipo === "cargando" && <LoadingState compact label="Cargando pasaporte…"/>}
      {resultado.tipo !== "cargando" && resultado.tipo !== "listo" && <section role="status" className={`${tarjeta} mx-auto my-16 max-w-lg space-y-4 text-center sm:my-28`}>
        <div aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">ⓘ</div>
        <h1 className="text-xl font-semibold">{resultado.tipo === "invalido" ? "El enlace no es válido" : resultado.tipo === "privado" ? "Pasaporte no encontrado o privado" : "No pudimos mostrar el pasaporte"}</h1>
        <p className="text-sm leading-relaxed text-slate-500">{resultado.tipo === "invalido" ? "Revisa que la dirección esté completa o solicita un nuevo enlace al estudiante." : resultado.tipo === "privado" ? "Comprueba el enlace. Solo se pueden consultar pasaportes autorizados para publicación." : resultado.tipo === "formato" ? "El contenido de este pasaporte no está disponible en este momento." : "No pudimos consultar el servicio. Vuelve a intentarlo."}</p>
        <div className="flex flex-wrap justify-center gap-4">{resultado.tipo !== "invalido" && <button type="button" onClick={() => { setResultado({ tipo: "cargando" }); setIntento(valor => valor + 1); }} className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Reintentar</button>}<Link href="/passport" className="self-center text-sm text-blue-700 no-underline">Consultar otro pasaporte</Link></div>
      </section>}
      {datos && <>
        <section className={`${tarjeta} flex flex-wrap items-start justify-between gap-5`}><div><p className="text-xs font-medium tracking-wider text-slate-500 uppercase">Pasaporte de competencias</p><h1 className="mt-2 text-3xl font-bold">{datos.nombre || "Nombre no disponible"}</h1><p className="mt-1 text-base">Desafío: {datos.desafio || "No disponible"}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">{datos.evaluado && <span className="rounded-full bg-teal-50 px-3 py-1 font-medium text-teal-700">✓ EVALUADO</span>}{datos.evaluador && <span>Evaluado por {datos.evaluador}</span>}{fecha && <span>{fecha}</span>}</div></div><div className="flex flex-wrap gap-3"><CopiarEnlace/>{evidenciaDisponible ? <a href="#seccion-evidencia" className="inline-flex min-h-10 items-center rounded-md border border-blue-700 px-4 text-sm text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Ver evidencia ↗</a> : <button type="button" disabled aria-describedby="evidencia-no-disponible" className="min-h-10 cursor-not-allowed rounded-md border border-slate-200 bg-slate-200 px-4 text-sm text-slate-500">Ver evidencia ↗</button>}</div></section>
        <div className="grid items-start gap-6 lg:grid-cols-12"><div className="space-y-6 lg:col-span-8">
          <section className={tarjeta}><h2 className={titulo}>Resumen para reclutadores</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{datos.resumen || vacio}</p><p className="mt-4 rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">ⓘ Este pasaporte refleja los resultados de un solo desafío y no representa la capacidad general de la persona.</p></section>
          <section className={tarjeta}><h2 className={titulo}>Competencias evaluadas</h2>{datos.competencias.length ? <div className="divide-y divide-slate-100">{datos.competencias.map((competencia, indice) => <article key={indice} className="py-5"><h3 className="font-semibold">{competencia.titulo}</h3>{competencia.puntuacion !== null && <p className="mt-2 text-sm text-blue-800">{competencia.puntuacion}{competencia.maximo !== null && competencia.maximo > 0 ? ` de ${competencia.maximo}` : " puntos"}</p>}{competencia.puntuacion !== null && competencia.maximo !== null && competencia.maximo > 0 && competencia.puntuacion >= 0 && competencia.puntuacion <= competencia.maximo && <meter aria-label={`Puntuación de ${competencia.titulo}`} value={competencia.puntuacion} min={0} max={competencia.maximo} className="mt-2 h-2 w-32"/>}<p className="mt-2 text-sm leading-relaxed text-slate-600">{competencia.descripcion || vacio}</p><h4 className="mt-3 text-xs font-medium">Comentario del evaluador</h4><p className="mt-2 whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed">{competencia.comentario || "No hay un comentario público disponible."}</p></article>)}</div> : <p className="mt-3 text-sm text-slate-500">No hay competencias disponibles en esta respuesta pública.</p>}</section>
          {datos.feedback && <section className={tarjeta}><h2 className={titulo}>Feedback del evaluador</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{datos.feedback}</p></section>}
          {datos.defensa && <section className={tarjeta}><h2 className={titulo}>Defensa y adaptación</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{datos.defensa}</p></section>}
          {(!datos.feedback || !datos.defensa) && <section role="status" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800"><span aria-hidden="true">ⓘ</span><div><h2 className="text-sm font-semibold">Información parcial</h2><p className="mt-1 text-xs leading-relaxed">{!datos.feedback && !datos.defensa ? "El feedback completo y la defensa no están disponibles en este pasaporte público." : !datos.feedback ? "El feedback completo no está disponible en este pasaporte público." : "La defensa y adaptación no están disponibles en este pasaporte público."}</p></div></section>}
        </div><aside className="space-y-6 lg:col-span-4">
          <section className={tarjeta}><h2 className="font-semibold">Evaluador</h2><p className="mt-3 text-sm">{datos.evaluador || "No disponible"}</p>{fecha && <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Evaluación publicada el {fecha}</p>}</section>
          <section id="seccion-evidencia" className={`${tarjeta} scroll-mt-6`}><h2 className="font-semibold">Evidencia</h2>{!evidenciaDisponible ? <p id="evidencia-no-disponible" className="mt-3 flex gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500"><span aria-hidden="true">▣</span>Esta evidencia no está disponible para consulta pública.</p> : <div className="mt-3 space-y-3">{[["Repositorio en GitHub", datos.repositorio], ["Documentación técnica (ADR)", datos.documentacion]].map(([etiqueta, url]) => <div key={etiqueta} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm"><span>{etiqueta}</span>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="ml-3 rounded text-blue-700 no-underline focus-visible:outline-2 focus-visible:outline-blue-700">Ver ↗<span className="sr-only"> {etiqueta}, abre en otra pestaña</span></a> : <p className="mt-1 text-xs text-slate-500">Enlace público no disponible.</p>}</div>)}</div>}</section>
          <section className={tarjeta}><h2 className="font-semibold">Compartir</h2><p className="my-3 text-sm text-slate-500">Comparte este pasaporte con quien necesites.</p><CopiarEnlace/></section>
        </aside></div>
      </>}
    </main><footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500"><div className="mx-auto flex max-w-[1200px] justify-between gap-3"><span>© {2026} SKILLPROOF</span><div className="flex gap-2"><button type="button" disabled title="Términos aún no está disponible">Términos</button><span>·</span><button type="button" disabled title="Soporte aún no está disponible">Soporte</button></div></div></footer>
  </div>;
}
