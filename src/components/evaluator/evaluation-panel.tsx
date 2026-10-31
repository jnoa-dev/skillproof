"use client";


import { LoadingState } from "@/components/ui/loading-state";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { enlacePublico, registro, texto } from "@/lib/passport/datos";
import EntrevistasEntrega from "./submission-interviews";
import DefenseReview from "@/components/defense/review";

type Criterio = {
  id: string;
  titulo: string;
  descripcion: string;
  maximo: number;
  peso: number | null;
};
type EvidenciaIA = {
  file: string;
  lineStart: number;
  lineEnd: number;
  observation: string;
};

type ResultadoIA = {
  criterionId: string;
  title: string;
  score: number | null;
  maxScore: number;
  rationale: string;
  evidence: EvidenciaIA[];
};
type Puntaje = { valor: string; comentario: string };
type Props = {
  challengeId: string;
  candidateId: string;
  submissionId: string;
  usuarioId: string;
  nombreEvaluador: string;
  nombreEstudiante: string;
  tituloDesafio: string;
  soloLectura: boolean;
  evidencia: {
    repositorio: string | null;
    documentacion: string | null;
    justificacion: string | null;
    problema: string | null;
    actualizada: string | null;
  };
};

const esUuid = (valor: unknown): valor is string =>
  typeof valor === "string" && /^[0-9a-f-]{36}$/i.test(valor);
const entrada =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm focus:outline-2 focus:outline-blue-700 disabled:opacity-60";
const tarjeta =
  "rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const boton =
  "min-h-12 rounded-lg border px-5 text-sm font-semibold transition-[scale,box-shadow] enabled:hover:shadow-md motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

export function ListaEntregas() {
  const [entregas, setEntregas] = useState<
    { id: string; fecha: string }[] | null
  >(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    const controlador = new AbortController();
    async function consultar() {
      try {
        const respuesta = await fetch("/api/evaluator/submissions", {
          cache: "no-store",
          signal: controlador.signal,
        });
        const contenido = registro(await respuesta.json());
        if (!respuesta.ok)
          throw new Error(
            texto(contenido.error) || "No pudimos cargar las entregas.",
          );
        if (!Array.isArray(contenido.submissions))
          throw new Error("La respuesta de entregas no es válida.");
        const lista = contenido.submissions
          .map(registro)
          .filter((item) => esUuid(item.id))
          .map((item) => ({
            id: item.id as string,
            fecha: texto(item.updated_at),
          }));
        if (!controlador.signal.aborted) setEntregas(lista);
      } catch (problema) {
        if (!controlador.signal.aborted)
          setError(
            problema instanceof Error
              ? problema.message
              : "No pudimos cargar las entregas.",
          );
      }
    }
    void consultar();
    return () => controlador.abort();
  }, [intento]);
  if (error)
    return (
      <div role="alert" className={`${tarjeta} space-y-4 text-sm text-red-700`}>
        <p>{error}</p>
        <button
          type="button"
          className={boton}
          onClick={() => {
            setError("");
            setEntregas(null);
            setIntento((valor) => valor + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  if (!entregas)
    return (
      <LoadingState compact label="Cargando entregas…"/>
    );
  if (!entregas.length)
    return (
      <section role="status" className={`${tarjeta} py-12 text-center`}>
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-700"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 7V5h6l2 2h10v3M3 7h6l2 2h10l-3 10H2Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">
          Aún no hay entregas disponibles.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Cuando haya soluciones enviadas disponibles para revisión, aparecerán
          listadas en esta sección.
        </p>
      </section>
    );
  return (
    <>
      <p className="text-xs text-slate-500">
        Se muestran hasta 100 entregas, según el límite actual del servicio.
      </p>
      <ul className="space-y-4">
        {entregas.map((entrega) => (
          <li
            key={entrega.id}
            className={`${tarjeta} flex flex-wrap items-center justify-between gap-4`}
          >
            <div>
              <h2 className="break-all text-sm font-semibold">
                Entrega {entrega.id}
              </h2>
              {entrega.fecha && !Number.isNaN(Date.parse(entrega.fecha)) && (
                <p className="mt-2 text-xs text-slate-500">
                  Actualizada:{" "}
                  {new Intl.DateTimeFormat("es-PE", {
                    dateStyle: "medium",
                    timeZone: "America/Lima",
                  }).format(new Date(entrega.fecha))}
                </p>
              )}
            </div>
            <Link
              href={`/evaluator/submissions/${entrega.id}`}
              className={`${boton} inline-flex items-center border-blue-700 text-blue-700`}
            >
              Abrir revisión →
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function EvaluationPanel({
  challengeId,
  candidateId,
  submissionId,
  usuarioId,
  nombreEvaluador,
  nombreEstudiante,
  tituloDesafio,
  evidencia,
  soloLectura,
}: Props) {
  const [seccion, setSeccion] = useState<"evaluacion" | "entrevistas" | "defensa">("evaluacion");
  const [registrarEntrevista, setRegistrarEntrevista] = useState(false);
  const [totalEntrevistas, setTotalEntrevistas] = useState<number | null>(null);
  const [navegacion, setNavegacion] = useState<string[]>([]);
  const [guardada, setGuardada] = useState(false);
  const perfilModal = useRef<HTMLDialogElement>(null);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [criteriosSeleccionadosIA, setCriteriosSeleccionadosIA] = useState<
    string[]
  >([]);
  const [resultadosIA, setResultadosIA] = useState<ResultadoIA[]>([]);
  const [analizandoIA, setAnalizandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState("");

  const [puntajes, setPuntajes] = useState<Record<string, Puntaje>>({});
  const [resumen, setResumen] = useState("");
  const [certificada, setCertificada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<"draft" | "finalize" | null>(null);
  const [finalizada, setFinalizada] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(soloLectura);
  const [errorCarga, setErrorCarga] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [intento, setIntento] = useState(0);
  const [errorGuardado, setErrorGuardado] = useState(false);
  const [ultimaAccion, setUltimaAccion] = useState<"draft" | "finalize">(
    "draft",
  );

  const enCurso = useRef(false);
  const modal = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controlador = new AbortController();
    async function consultar() {
      try {
        const respuesta = await fetch(
          `/api/evaluator/evaluations?submissionId=${encodeURIComponent(submissionId)}`,
          { cache: "no-store", signal: controlador.signal },
        );
        const contenido = registro(await respuesta.json());
        if (!respuesta.ok)
          throw new Error(
            texto(contenido.error) || "No pudimos cargar la evaluación.",
          );
        if (
          !Array.isArray(contenido.criteria) ||
          !Array.isArray(contenido.scores)
        )
          throw new Error("La rúbrica recibida no es válida.");
        const rubrica = contenido.criteria
          .map(registro)
          .map((item) => ({
            id: texto(item.id),
            titulo: texto(item.title),
            descripcion: texto(item.description),
            peso: item.weight !== null && item.weight !== undefined && Number.isFinite(Number(item.weight)) ? Number(item.weight) : null,
            maximo:
              item.max_score === null || item.max_score === undefined
                ? NaN
                : Number(item.max_score),
          }));
        if (
          rubrica.some(
            (item) =>
              !esUuid(item.id) ||
              !Number.isFinite(item.maximo) ||
              item.maximo <= 0,
          ) ||
          new Set(rubrica.map((item) => item.id)).size !== rubrica.length ||
          rubrica.length > 50
        )
          throw new Error(
            "La configuración de la rúbrica no permite evaluar esta entrega.",
          );
        const valores: Record<string, Puntaje> = {};
        for (const criterio of rubrica)
          valores[criterio.id] = { valor: "", comentario: "" };
        for (const item of contenido.scores.map(registro)) {
          const id = texto(item.criterion_id);
          if (
            valores[id] &&
            typeof item.score === "number" &&
            Number.isFinite(item.score)
          )
            valores[id] = {
              valor: String(item.score),
              comentario: texto(item.notes),
            };
        }
        const evaluacion = registro(contenido.evaluation);
        if (!controlador.signal.aborted) {
          setCriterios(rubrica);
          setCriteriosSeleccionadosIA(rubrica.map((criterio) => criterio.id));
          setPuntajes(valores);
          setResumen(texto(evaluacion.summary));
          setFinalizada(evaluacion.status === "finalized");
          setGuardada(Boolean(evaluacion.id));
        }
      } catch (problema) {
        if (!controlador.signal.aborted)
          setErrorCarga(
            problema instanceof Error
              ? problema.message
              : "No pudimos cargar la evaluación.",
          );
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }
    void consultar();
    return () => controlador.abort();
  }, [submissionId, usuarioId, soloLectura, intento]);

  useEffect(() => {
    const controlador = new AbortController();
    async function cargarNavegacion() {
      try {
        const respuesta = await fetch("/api/evaluator/submissions", { cache: "no-store", signal: controlador.signal });
        if (!respuesta.ok) return;
        const contenido = registro(await respuesta.json());
        if (!Array.isArray(contenido.submissions)) return;
        if (!controlador.signal.aborted) setNavegacion(contenido.submissions.map(registro).map(item => texto(item.id)).filter(esUuid));
      } catch { /* La navegación auxiliar no bloquea la evaluación. */ }
    }
    void cargarNavegacion();
    return () => controlador.abort();
  }, []);

  const valido = (criterio: Criterio) => {
    const valor = puntajes[criterio.id]?.valor ?? "";
    return (
      valor.trim() !== "" &&
      Number.isFinite(Number(valor)) &&
      Number(valor) >= 0 &&
      Number(valor) <= criterio.maximo
    );
  };
  const calificadas = criterios.filter(valido).length;
  const textosValidos =
    resumen.length <= 10000 &&
    Object.values(puntajes).every((item) => item.comentario.length <= 5000);
  const bloqueada =
    cargando ||
    Boolean(errorCarga) ||
    Boolean(guardando) ||
    finalizada ||
    sinPermiso;
  const puedeFinalizar =
    !bloqueada &&
    criterios.length > 0 &&
    calificadas === criterios.length &&
    certificada &&
    textosValidos;
  const mostrarPendientes =
    !cargando &&
    !errorCarga &&
    !finalizada &&
    !sinPermiso &&
    (calificadas > 0 || certificada);
  const faltantes = criterios.length - calificadas;
  const evidenciaIncompleta =
    !enlacePublico(evidencia.repositorio) ||
    !enlacePublico(evidencia.documentacion);

  async function guardar(accion: "draft" | "finalize") {
    if (
      enCurso.current ||
      bloqueada ||
      !criterios.length ||
      !textosValidos ||
      (accion === "finalize" && !puedeFinalizar)
    )
      return;
    if (
      criterios.some(
        (criterio) => puntajes[criterio.id]?.valor !== "" && !valido(criterio),
      )
    ) {
      setErrorGuardado(false);
      setExito(false);
      setMensaje(
        "Revisa los puntajes: deben estar dentro del máximo de cada criterio.",
      );
      return;
    }
    enCurso.current = true;
    setGuardando(accion);
    setUltimaAccion(accion);
    setErrorGuardado(false);
    setMensaje("");
    setExito(false);
    let recuperable = false;
    try {
      const respuesta = await fetch("/api/evaluator/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: accion,
          submissionId,
          summary: resumen,
          scores: criterios
            .filter(valido)
            .map((criterio) => ({
              criterionId: criterio.id,
              score: Number(puntajes[criterio.id].valor),
              notes: puntajes[criterio.id].comentario,
            })),
        }),
      });
      const contenido = registro(await respuesta.json());
      if (!respuesta.ok) {
        recuperable = respuesta.status >= 500;
        if ([401, 403, 409].includes(respuesta.status)) setSinPermiso(true);
        throw new Error(
          texto(contenido.error) ||
            "No pudimos guardar la evaluación. Tus datos siguen en el formulario.",
        );
      }
      const estado = registro(contenido.evaluation).status;
      if (estado === "finalized") setFinalizada(true);
      if (accion === "finalize" && estado !== "finalized")
        throw new Error(
          "No pudimos confirmar la finalización. Comprueba el estado antes de volver a enviarla.",
        );
      setGuardada(true);
      setExito(true);
      setMensaje(
        accion === "finalize"
          ? "Evaluación finalizada. Esto no confirma la publicación del pasaporte."
          : "Evaluación guardada.",
      );
    } catch (problema) {
      setErrorGuardado(
        recuperable ||
          problema instanceof TypeError ||
          problema instanceof SyntaxError,
      );
      setMensaje(
        problema instanceof TypeError || problema instanceof SyntaxError
          ? "No pudimos completar la acción. Reintenta; tus datos siguen disponibles."
          : problema instanceof Error
            ? problema.message
            : "Error de conexión. Tus datos siguen disponibles; vuelve a intentarlo.",
      );
    } finally {
      setGuardando(null);
      enCurso.current = false;
    }
  }

  async function revisarConIA() {
    if (analizandoIA || criteriosSeleccionadosIA.length === 0) return;

    setAnalizandoIA(true);
    setErrorIA("");
    setResultadosIA([]);

    try {
      const response = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          criterionIds: criteriosSeleccionadosIA,
        }),
      });

      const payload = registro(await response.json());

      if (!response.ok) {
        throw new Error(
          texto(payload.error) || "No se pudo revisar el repositorio.",
        );
      }

      const review = registro(payload.review);

      if (!Array.isArray(review.results)) {
        throw new Error("La respuesta de la IA no tiene el formato esperado.");
      }

      setResultadosIA(review.results as ResultadoIA[]);
    } catch (error) {
      setErrorIA(
        error instanceof Error
          ? error.message
          : "Error al revisar el repositorio.",
      );
    } finally {
      setAnalizandoIA(false);
    }
  }

  const fecha =
    evidencia.actualizada && !Number.isNaN(Date.parse(evidencia.actualizada))
      ? new Intl.DateTimeFormat("es-PE", {
          dateStyle: "medium",
          timeZone: "America/Lima",
        }).format(new Date(evidencia.actualizada))
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#14263d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex min-h-16 flex-wrap items-center gap-8">
            <Link href="/evaluator" className="text-xl font-bold">
              SKILLPROOF
            </Link>
            <nav
              aria-label="Navegación del evaluador"
              className="flex gap-6 text-sm"
            >
              <Link href="/evaluator" className="text-slate-600 hover:text-blue-700">Inicio</Link>
              <Link
                href="/evaluator/submissions"
                className="text-slate-600 hover:text-blue-700"
              >
                Entregas por evaluar
              </Link>
              <Link href="/evaluator/interviews" className="text-slate-600 hover:text-blue-700">Entrevistas</Link>
            </nav>
          </div>
          <Link
            href="/account"
            aria-label="Mi cuenta"
            className="rounded-lg py-3 text-right text-sm hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <p className="font-semibold">{nombreEvaluador}</p>
            <p className="text-xs text-slate-500">Evaluador</p>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8">
        <nav
          aria-label="Migas de pan"
          className="flex flex-wrap gap-2 text-sm text-slate-500"
        >
          <Link href="/evaluator/submissions" className="text-blue-700">
            Entregas por evaluar
          </Link>
          <span aria-hidden="true">›</span>
          <span>{tituloDesafio}</span>
          <span aria-hidden="true">›</span>
          <span>{nombreEstudiante}</span>
        </nav>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl"><h1 className="text-3xl font-bold tracking-tight">Evaluación: {tituloDesafio}</h1><span className={`mt-3 inline-flex rounded border px-2 py-1 text-xs font-semibold uppercase ${finalizada ? "border-emerald-200 bg-emerald-50 text-emerald-800" : guardada ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-100 bg-blue-50 text-slate-700"}`}>{cargando ? "Cargando" : finalizada ? "Finalizada" : guardada ? "En revisión" : "Sin evaluar"}</span><p className="mt-3 text-sm text-slate-600">Estudiante: <strong>{nombreEstudiante}</strong>{fecha && <> · Entrega actualizada el {fecha}</>}</p></div>
          <div className="space-y-3"><div className="flex flex-wrap gap-2"><Link href={`/evaluator/candidates/${candidateId}`} className={`${boton} inline-flex items-center border-slate-300 bg-white`}>Ver perfil del candidato</Link><button type="button" onClick={() => { setSeccion("entrevistas"); setRegistrarEntrevista(true); }} className={`${boton} border-slate-300 bg-white`}>Registrar entrevista</button></div>{navegacion.includes(submissionId) && <nav aria-label="Navegar entre entregas" className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 text-xs">{navegacion.indexOf(submissionId) > 0 ? <Link aria-label="Entrega anterior" href={`/evaluator/submissions/${navegacion[navegacion.indexOf(submissionId) - 1]}`} className="rounded p-2 text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700">←</Link> : <span aria-disabled="true" className="p-2 text-slate-300">←</span>}<span>{navegacion.indexOf(submissionId) + 1} de {navegacion.length} cargadas</span>{navegacion.indexOf(submissionId) < navegacion.length - 1 ? <Link aria-label="Entrega siguiente" href={`/evaluator/submissions/${navegacion[navegacion.indexOf(submissionId) + 1]}`} className="rounded p-2 text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700">→</Link> : <span aria-disabled="true" className="p-2 text-slate-300">→</span>}</nav>}</div>
        </div>
        <nav aria-label="Secciones de la entrega" className="mt-6 flex gap-6 border-b border-slate-200 text-sm"><button type="button" aria-pressed={seccion === "evaluacion"} onClick={() => setSeccion("evaluacion")} className={`min-h-12 border-b-2 font-medium focus-visible:outline-2 focus-visible:outline-blue-700 ${seccion === "evaluacion" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600"}`}>Evaluación</button><button type="button" aria-pressed={seccion === "entrevistas"} onClick={() => setSeccion("entrevistas")} className={`min-h-12 border-b-2 font-medium focus-visible:outline-2 focus-visible:outline-blue-700 ${seccion === "entrevistas" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600"}`}>Entrevistas{totalEntrevistas !== null ? ` (${totalEntrevistas})` : ""}</button><button type="button" onClick={() => setSeccion("defensa")} aria-pressed={seccion === "defensa"} className={`min-h-12 border-b-2 font-medium focus-visible:outline-2 focus-visible:outline-blue-700 ${seccion === "defensa" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600"}`}>Defensa técnica</button></nav>
        <div hidden={seccion !== "defensa"} className="mt-8">{seccion === "defensa" && <DefenseReview submissionId={submissionId} challengeId={challengeId} interview={() => { setSeccion("entrevistas"); setRegistrarEntrevista(true); }}/>}</div>

        <div hidden={seccion !== "entrevistas"} className="pt-6"><EntrevistasEntrega submissionId={submissionId} nombreEstudiante={nombreEstudiante} tituloDesafio={tituloDesafio} repositorio={evidencia.repositorio} registrar={registrarEntrevista} alCerrarRegistro={() => setRegistrarEntrevista(false)} alContar={setTotalEntrevistas}/></div>
        <div hidden={seccion !== "evaluacion"}><div className="mt-8 grid items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5"><div className="flex justify-between text-xs font-medium uppercase"><span>Evidencia técnica presentada</span><span className="text-slate-500">Solo lectura</span></div>
            {evidenciaIncompleta && (
              <section
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900"
              >
                <h2 className="text-sm font-semibold">
                  Algunos enlaces de evidencia no están disponibles.
                </h2>
                <p className="mt-2 text-xs leading-relaxed">
                  Puedes revisar el contenido recibido. Un enlace válido no
                  confirma que el recurso siga siendo público o accesible.
                </p>
              </section>
            )}
            {[
              ["Repositorio", evidencia.repositorio, "Abrir repositorio"],
              [
                "Documentación técnica",
                evidencia.documentacion,
                "Abrir documentación",
              ],
            ].map(([etiqueta, valor, accion]) => {
              const url = enlacePublico(valor);
              return (
                <section key={etiqueta} className={tarjeta}>
                  <h2 className="text-xl font-semibold">{etiqueta}</h2>
                  <p className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-sm text-cyan-200 leading-relaxed">
                    {valor || "No disponible"}
                  </p>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${boton} mt-4 flex items-center justify-center gap-2 border-slate-300`}
                    >
                      {accion} ↗
                    </a>
                  )}
                </section>
              );
            })}
            <section className={tarjeta}>
              <h2 className="text-xl font-semibold">
                Justificación técnica del estudiante
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                {evidencia.justificacion || "No disponible"}
              </p>
            </section>
            <section className={tarjeta}>
              <h2 className="text-lg font-semibold">
                Problema e investigación
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                {evidencia.problema || "No disponible"}
              </p>
            </section>
          </div>
          <div className="space-y-6 lg:col-span-7">
            {errorGuardado && mensaje && (
              <section
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
              >
                <p className="text-sm">{mensaje}</p>
                <button
                  type="button"
                  disabled={
                    bloqueada ||
                    (ultimaAccion === "finalize" && !puedeFinalizar)
                  }
                  onClick={() => {
                    if (ultimaAccion === "finalize") modal.current?.showModal();
                    else void guardar("draft");
                  }}
                  className={`${boton} border-red-300 bg-white text-red-800`}
                >
                  ↻ Reintentar
                </button>
              </section>
            )}
            <section className="rounded-xl border border-dashed border-teal-600 bg-teal-50 p-6">
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="font-semibold text-teal-900">
                  ✧ Revisión de código con IA
                </h2>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs text-teal-800">
                  Apoyo · no define la nota
                </span>
              </div>

              <p className="mt-2 text-sm text-teal-900">
                Elige los criterios que quieres revisar. Se analizará una
                muestra limitada del repositorio.
              </p>

              <fieldset className="mt-4 grid gap-2 sm:grid-cols-3" disabled={analizandoIA || cargando || Boolean(errorCarga)}>
                <legend className="text-sm font-semibold">
                  Criterios para esta revisión
                </legend>

                {criterios.map((criterio) => (
                  <label
                    key={criterio.id}
                    className="flex items-start gap-2 rounded-md border border-teal-200 bg-white p-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={criteriosSeleccionadosIA.includes(criterio.id)}
                      onChange={(event) => {
                        setCriteriosSeleccionadosIA((actuales) =>
                          event.target.checked
                            ? [...actuales, criterio.id]
                            : actuales.filter((id) => id !== criterio.id),
                        );
                      }}
                      className="mt-1 accent-teal-700"
                    />
                    <span>{criterio.titulo}</span>
                  </label>
                ))}
              </fieldset>

              <button
                type="button"
                onClick={() => void revisarConIA()}
                disabled={analizandoIA || cargando || Boolean(errorCarga) || criteriosSeleccionadosIA.length === 0}
                className={`${boton} mt-4 border-teal-700 bg-teal-700 text-white`}
              >
                {analizandoIA
                  ? "Revisando repositorio..."
                  : "Revisar criterios seleccionados"}
              </button>

              {errorIA && (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {errorIA}
                </p>
              )}

              {resultadosIA.length > 0 && (
                <div className="mt-5 space-y-4">
                  {resultadosIA.map((resultado) => (
                    <article
                      key={resultado.criterionId}
                      className="rounded-lg border border-teal-200 bg-white p-4"
                    >
                      <h3 className="font-semibold">{resultado.title}</h3>

                      <p className="mt-1 text-sm">
                        Puntaje sugerido:{" "}
                        <strong>
                          {resultado.score === null
                            ? "Sin evidencia suficiente"
                            : `${resultado.score} / ${resultado.maxScore}`}
                        </strong>
                      </p>

                      <p className="mt-2 text-sm">{resultado.rationale}</p>

                      {resultado.evidence.map((evidencia, index) => (
                        <p
                          key={`${evidencia.file}-${index}`}
                          className="mt-2 break-all text-xs text-slate-600"
                        >
                          {evidencia.file}, líneas {evidencia.lineStart}–
                          {evidencia.lineEnd}: {evidencia.observation}
                        </p>
                      ))}
                    </article>
                  ))}
                </div>
              )}

              <p role="status" className="mt-3 text-xs text-teal-800">Estado: {analizandoIA ? "Analizando repositorio…" : resultadosIA.length ? "Resultados disponibles" : "Sin resultados aún"}</p>
              <p className="mt-4 border-t border-teal-200 pt-3 text-xs text-slate-600">
                La IA no guarda ni finaliza la evaluación. El evaluador revisa
                la evidencia y decide el puntaje final. Sugerencia generada por IA; puede contener errores.
              </p>
            </section>{" "}
            <section
              id="decision-evaluador"
              aria-busy={cargando || Boolean(guardando)}
              className={`${tarjeta} scroll-mt-6`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div><h2 className="text-2xl font-bold">Decisión del evaluador</h2><p className="mt-1 text-sm text-slate-600">Califica de forma independiente cada dimensión técnica obligatoria.</p></div>
                <span
                  aria-live="polite"
                  className={`rounded-full bg-blue-50 px-3 py-2 text-xs ${calificadas === criterios.length && criterios.length > 0 ? "font-semibold text-blue-700" : "text-slate-500"}`}
                >
                  {calificadas === criterios.length && criterios.length > 0 && (
                    <span aria-hidden="true">✓ </span>
                  )}
                  {calificadas} de {criterios.length} dimensiones calificadas
                </span>
              </div>
              {cargando ? (
                <LoadingState compact label="Cargando rúbrica…"/>
              ) : errorCarga ? (
                <div
                  role="alert"
                  className="mt-5 space-y-4 text-sm text-red-700"
                >
                  <p>{errorCarga}</p>
                  <button
                    type="button"
                    className={boton}
                    onClick={() => {
                      setCargando(true);
                      setErrorCarga("");
                      setIntento((valor) => valor + 1);
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  {!criterios.length && (
                    <p className="mt-5 text-sm text-slate-500">
                      No hay criterios activos. No se puede guardar ni finalizar
                      esta evaluación.
                    </p>
                  )}
                  {sinPermiso && (
                    <p
                      role="status"
                      className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
                    >
                      Edición bloqueada por las restricciones de asignación o
                      acceso. Puedes volver al listado para comprobar el estado.
                    </p>
                  )}
                  {finalizada && (
                    <p
                      role="status"
                      className="mt-5 rounded-lg bg-teal-50 p-4 text-sm text-teal-800"
                    >
                      Evaluación finalizada. Los puntajes y comentarios están
                      bloqueados para edición. Esto no confirma la publicación
                      del pasaporte.
                    </p>
                  )}
                  <fieldset
                    disabled={bloqueada}
                    className="mt-6 min-w-0 space-y-5 border-0 p-0"
                  >
                    {criterios.map((criterio, indice) => (
                      <fieldset
                        key={criterio.id}
                        className={`rounded-xl border bg-[#eff3ff] p-5 ${mostrarPendientes && !valido(criterio) ? "border-amber-400" : "border-slate-200"}`}
                      >
                        <legend className="px-1 text-lg font-semibold">
                          {indice + 1}. {criterio.titulo || "Criterio sin título"}
                        </legend>
                        {criterio.peso !== null && <p className="mb-2 text-right text-xs text-slate-600">Peso {criterio.peso} %</p>}
                        <p className="text-sm leading-relaxed text-slate-600">
                          {criterio.descripcion || "Sin descripción adicional."}
                        </p>
                        {Number.isInteger(criterio.maximo) &&
                        criterio.maximo <= 10 ? (
                          <div
                            className="mt-4 flex flex-wrap gap-2"
                            role="group"
                            aria-label={`Puntaje para ${criterio.titulo}`}
                          >
                            {Array.from(
                              { length: criterio.maximo + 1 },
                              (_, valor) => (
                                <button
                                  key={valor}
                                  type="button"
                                  aria-pressed={
                                    puntajes[criterio.id]?.valor ===
                                    String(valor)
                                  }
                                  onClick={() =>
                                    setPuntajes((anteriores) => ({
                                      ...anteriores,
                                      [criterio.id]: {
                                        ...anteriores[criterio.id],
                                        valor: String(valor),
                                      },
                                    }))
                                  }
                                  className={`min-h-11 rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60 ${puntajes[criterio.id]?.valor === String(valor) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white"}`}
                                >
                                  {puntajes[criterio.id]?.valor ===
                                    String(valor) && (
                                    <span aria-hidden="true">✓ </span>
                                  )}
                                  {valor}
                                </button>
                              ),
                            )}
                          </div>
                        ) : (
                          <label className="mt-4 block text-sm">
                            Puntaje (0 a {criterio.maximo})
                            <input
                              type="number"
                              min={0}
                              max={criterio.maximo}
                              step="any"
                              value={puntajes[criterio.id]?.valor ?? ""}
                              onChange={(event) =>
                                setPuntajes((anteriores) => ({
                                  ...anteriores,
                                  [criterio.id]: {
                                    ...anteriores[criterio.id],
                                    valor: event.target.value,
                                  },
                                }))
                              }
                              className={entrada}
                            />
                          </label>
                        )}
                        <label className="mt-4 block text-sm font-medium">
                          Comentario de la dimensión
                          <textarea
                            rows={3}
                            maxLength={5000}
                            disabled={bloqueada || !valido(criterio)}
                            value={puntajes[criterio.id]?.comentario ?? ""}
                            onChange={(event) =>
                              setPuntajes((anteriores) => ({
                                ...anteriores,
                                [criterio.id]: {
                                  ...anteriores[criterio.id],
                                  comentario: event.target.value,
                                },
                              }))
                            }
                            className={entrada}
                            placeholder="Describe tus observaciones técnicas..."
                          />
                        </label>
                        {!valido(criterio) && (
                          <p
                            className={`mt-2 text-xs ${mostrarPendientes ? "text-amber-800" : "text-slate-500"}`}
                          >
                            Selecciona un puntaje de 0 a {criterio.maximo} para
                            guardar un comentario.
                          </p>
                        )}
                      </fieldset>
                    ))}
                    <label className="block text-sm font-semibold">
                      Observación general para el Pasaporte
                      <p className="mt-2 text-xs font-normal leading-relaxed text-slate-500">
                        Finalizar no publica automáticamente este texto en el
                        pasaporte. Su visibilidad depende del mecanismo de
                        publicación existente.
                      </p>
                      <textarea
                        rows={4}
                        maxLength={10000}
                        value={resumen}
                        onChange={(event) => setResumen(event.target.value)}
                        className={entrada}
                        placeholder="Redacta una observación general sobre la entrega..."
                      />
                    </label>
                    {!finalizada && (
                      <label
                        className={`flex min-h-11 items-start gap-3 rounded-lg border bg-slate-50 p-3 text-sm ${mostrarPendientes && !certificada ? "border-amber-400" : "border-transparent"}`}
                      >
                        <input
                          type="checkbox"
                          checked={certificada}
                          onChange={(event) =>
                            setCertificada(event.target.checked)
                          }
                          className="mt-0.5 size-5 shrink-0 accent-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700"
                        />
                        <span>
                          Certifico que revisé la evidencia y que esta
                          evaluación es mi decisión profesional.
                        </span>
                      </label>
                    )}
                    {mostrarPendientes &&
                      !puedeFinalizar &&
                      !guardando &&
                      (faltantes > 0 || !certificada) && (
                        <div
                          role="status"
                          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                        >
                          <h3 className="font-semibold">Falta información</h3>
                          <p className="mt-1 text-xs">
                            {faltantes > 0
                              ? `Califica ${faltantes === 1 ? "la dimensión restante" : `las ${faltantes} dimensiones restantes`}${!certificada ? " y marca la certificación" : ""}.`
                              : "Marca la certificación para finalizar."}
                          </p>
                        </div>
                      )}
                    {!finalizada && (
                      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          disabled={
                            bloqueada || !criterios.length || !textosValidos
                          }
                          onClick={() => void guardar("draft")}
                          className={`${boton} border-blue-700 text-blue-700`}
                        >
                          {guardando === "draft"
                            ? "Guardando..."
                            : "Guardar evaluación"}
                        </button>
                        <button
                          type="button"
                          disabled={!puedeFinalizar}
                          onClick={() => modal.current?.showModal()}
                          className={`${boton} border-blue-700 bg-blue-700 text-white`}
                        >
                          {guardando === "finalize"
                            ? "Finalizando..."
                            : "Finalizar evaluación"}
                        </button>
                      </div>
                    )}
                    {!finalizada && (
                      <p className="text-xs text-slate-500">
                        {puedeFinalizar
                          ? "✓ Todo listo para finalizar la evaluación."
                          : `Completa las ${criterios.length} dimensiones y la certificación para finalizar.`}{" "}
                        La certificación es una confirmación local y no se
                        almacena.
                      </p>
                    )}
                  </fieldset>
                </>
              )}
              {guardando && (
                <p
                  role="status"
                  className="mt-4 flex items-center gap-2 text-sm text-blue-700"
                >
                  <span
                    aria-hidden="true"
                    className="size-4 rounded-full border-2 border-blue-100 border-t-blue-700 motion-safe:animate-spin"
                  />
                  Guardando cambios en el servidor...
                </p>
              )}
              {mensaje && !errorGuardado && (
                <p
                  role={exito ? "status" : "alert"}
                  className={`mt-5 rounded-lg border p-4 text-sm ${exito ? "border-teal-200 bg-teal-50 text-teal-900" : "border-red-200 bg-red-50 text-red-800"}`}
                >
                  {mensaje}
                </p>
              )}
            </section>
            <section className={tarjeta} aria-labelledby="publicacion-evaluacion"><h2 id="publicacion-evaluacion" className="border-b border-slate-200 pb-4 text-lg font-semibold">Publicación</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>Evaluación finalizada</dt><dd>{cargando ? "Cargando…" : errorCarga ? "No disponible" : finalizada ? "Sí" : "No"}</dd></div><div className="flex justify-between gap-4"><dt>Resultado publicado</dt><dd>{cargando || errorCarga || finalizada ? "No confirmado" : "No"}</dd></div></dl><p className="mt-4 text-xs leading-relaxed text-slate-500">Finalizar no confirma la publicación. La visibilidad depende de la configuración del pasaporte del estudiante.</p></section>
          </div>
        </div></div>
      </main>
      <dialog ref={perfilModal} aria-labelledby="perfil-candidato-entrega" className="fixed inset-0 m-auto w-[calc(100%_-_3rem)] max-w-md rounded-xl border border-slate-200 bg-white p-6 text-[#14263d] shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"><h2 id="perfil-candidato-entrega" className="text-xl font-semibold">Perfil del candidato</h2><p className="mt-4 font-medium">{nombreEstudiante}</p><p className="mt-2 text-sm text-slate-600">Desafío: {tituloDesafio}</p><p className="mt-4 text-sm leading-relaxed text-slate-600">Esta vista muestra los datos disponibles en la entrega. Consulta el perfil del candidato para ver los antecedentes accesibles según tus permisos.</p><button type="button" onClick={() => perfilModal.current?.close()} className={`${boton} mt-5 border-slate-300`}>Cerrar</button></dialog>
      <dialog
        ref={modal}
        aria-labelledby="confirmar-evaluacion"
        className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]"
      >
        <h2 id="confirmar-evaluacion" className="text-xl font-semibold">
          Finalizar evaluación
        </h2>
        <p className="mt-4 text-sm leading-relaxed">
          La evaluación quedará cerrada para edición. Esta acción no confirma la
          publicación del pasaporte. ¿Quieres continuar?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => modal.current?.close()}
            className={`${boton} border-slate-300`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!puedeFinalizar}
            onClick={() => {
              modal.current?.close();
              void guardar("finalize");
            }}
            className={`${boton} border-blue-700 bg-blue-700 text-white`}
          >
            Confirmar finalización
          </button>
        </div>
      </dialog>
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-[1200px] justify-between gap-4">
          <span>© SKILLPROOF</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              title="Términos aún no está disponible"
            >
              Términos
            </button>
            <span>·</span>
            <button
              type="button"
              disabled
              title="Soporte aún no está disponible"
            >
              Soporte
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
