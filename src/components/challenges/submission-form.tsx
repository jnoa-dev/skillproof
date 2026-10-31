"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Draft = {
  id: string;
  github_repo_url: string | null;
  documentation: string | null;
  justification: string | null;
  problem_description: string | null;
};

type Props = {
  challengeId: string;
  draft: Draft | null;
  variante?: "pagina";
};

export default function SubmissionForm({ challengeId, draft, variante }: Props) {
  const router = useRouter();
  //const [submissionId, setSubmissionId] = useState(draft?.id ?? null);
  const [repoUrl, setRepoUrl] = useState(draft?.github_repo_url ?? "");
  const [documentation, setDocumentation] = useState(draft?.documentation ?? "");
  const [justification, setJustification] = useState(draft?.justification ?? "");
  const [problemDescription, setProblemDescription] = useState(
    draft?.problem_description ?? ""
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoria, setAutoria] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [repoRevisado, setRepoRevisado] = useState(false);
  const [errorConexion, setErrorConexion] = useState(false);
  const [accionActual, setAccionActual] = useState<"draft" | "submit" | null>(null);
  const [ultimaAccion, setUltimaAccion] = useState<"draft" | "submit">("draft");
  const modal = useRef<HTMLDialogElement>(null);
  const enCurso = useRef(false);
  const pagina = variante === "pagina";
  const urlValida = /^https:\/\/(www\.)?github\.com\/[^/]+\/[^/?#]+(\.git)?\/?$/i.test(repoUrl.trim());
  const puedeEnviar = urlValida && repoUrl.trim().length <= 500 &&
    [documentation, justification, problemDescription].every(valor => valor.trim().length > 0 && valor.trim().length <= 20000) && autoria;
  const errorRepo = pagina && repoRevisado && !urlValida;
  const campo = pagina
    ? "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition-shadow focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
    : "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2";

  async function saveSubmission(action: "draft" | "submit") {
    if (enCurso.current || enviada) return;
    setMessage("");
    setErrorConexion(false);
    if (pagina && action === "submit" && !autoria) {
      setMessage("Confirma la declaración de autoría antes de enviar.");
      return;
    }

    if (action === "submit") {
      const isGithubUrl = urlValida;

      if (
        !isGithubUrl ||
        !documentation.trim() ||
        !justification.trim() ||
        !problemDescription.trim()
      ) {
        setMessage("Completa todos los campos con una URL válida de GitHub.");
        return;
      }
    }

    enCurso.current = true;
    setUltimaAccion(action);
    setAccionActual(action);
    setLoading(true);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          challengeId,
          github_repo_url: repoUrl,
          documentation,
          justification,
          problem_description: problemDescription,
        }),
      });

      const result: {
        id?: string;
        status?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        setErrorConexion(response.status >= 500);
        setMessage(result.error ?? "No se pudo guardar la entrega.");
        return;
      }

      /*if (result.id) {
        setSubmissionId(result.id);
      }*/

      if (action === "submit") {
        setEnviada(true);
        setMessage("Entrega enviada correctamente.");
        router.refresh();
      } else {
        setMessage("Borrador guardado.");
        if (pagina) router.refresh();
      }
    } catch {
      setErrorConexion(true);
      setMessage("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
      setAccionActual(null);
      enCurso.current = false;
    }
  }

  return (
    <section id="entrega" aria-busy={loading} className={pagina ? "rounded-xl border border-slate-200 bg-white p-6 sm:p-8" : "mt-10 border-t border-gray-200 pt-8"}>
      {pagina && errorConexion && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"><div><p className="text-sm font-semibold">Error de conexión</p><p className="mt-1 text-xs">No pudimos completar la acción. Reintenta; tus datos siguen disponibles.</p></div><button type="button" disabled={loading || enviada || (ultimaAccion === "submit" && !puedeEnviar)} onClick={() => { if (ultimaAccion === "submit") modal.current?.showModal(); else void saveSubmission("draft"); }} className="rounded bg-red-700 px-3 py-2 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-60">↻ Reintentar</button></div>}
      <h2 className="text-xl font-semibold text-gray-900">Tu entrega</h2>
      <p className="mt-2 text-sm text-gray-600">
        {pagina ? "Completa los datos técnicos solicitados para enviar tu solución a revisión." : "Guarda un borrador para continuar después o envía cuando esté completo."}
      </p>

      <fieldset disabled={loading || enviada} className="mt-6 min-w-0 space-y-5 border-0 p-0">
        <label className="block text-sm font-medium text-gray-700">
          {pagina ? <>URL del repositorio GitHub <span className="text-red-700">*</span></> : "URL del repositorio público de GitHub"}
          <input
            type="url"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            onBlur={() => { if (pagina) setRepoRevisado(true); }}
            aria-invalid={pagina ? errorRepo : undefined}
            aria-describedby={errorRepo ? "error-url-entrega" : undefined}
            placeholder="https://github.com/usuario/proyecto"
            className={`${campo}${errorRepo ? " border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
          />
          {errorRepo && <span id="error-url-entrega" className="mt-1 block text-xs font-normal text-red-600">Ingresa la URL completa de un repositorio público de GitHub.</span>}
        </label>
        {pagina && <div className="space-y-5 text-sm text-slate-500"><p>El repositorio debe ser público</p><p>* Campo obligatorio</p></div>}

        <label className="block text-sm font-medium text-gray-700">
          {pagina ? "Enlace a documentación técnica (README / ADR)" : "Documentación de la solución"}
          <textarea
            value={documentation}
            onChange={(event) => setDocumentation(event.target.value)}
            rows={pagina ? 2 : 4}
            placeholder={pagina ? "https://github.com/.../docs/ADR.md" : undefined}
            className={campo}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          {pagina ? "Justificación técnica" : "Justificación de tus decisiones técnicas"}
          <textarea
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            rows={4}
            placeholder={pagina ? "Describe las decisiones de arquitectura y solución técnica implementada..." : undefined}
            className={campo}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          ¿Qué problema encontraste y cómo lo investigaste?
          <textarea
            value={problemDescription}
            onChange={(event) => setProblemDescription(event.target.value)}
            rows={4}
            className={campo}
          />
        </label>

        {pagina && <>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-slate-800"><input type="checkbox" checked={autoria} onChange={event => setAutoria(event.target.checked)} className="mt-0.5 size-5 shrink-0 rounded border-slate-300 accent-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"/><span>Certifico que la solución presentada es de mi autoría y cumple con las normas académicas y éticas de SKILLPROOF.</span></label>
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><span aria-hidden="true">⚠</span><p>Al enviar, ya no podrás editar esta versión.</p></div>
        </>}
        <div className={pagina ? "flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-3" : "flex flex-wrap gap-3"}>
          <button
            type="button"
            disabled={loading}
            onClick={() => saveSubmission("draft")}
            className={pagina ? "min-h-12 cursor-pointer rounded-lg border border-blue-700 px-6 text-sm font-semibold text-blue-700 transition-[scale,box-shadow] hover:shadow-sm motion-safe:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60" : "rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-800 disabled:opacity-60"}
          >
            {pagina && loading && accionActual === "draft" ? <span role="status" className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-4 rounded-full border-2 border-blue-100 border-t-blue-700 motion-safe:animate-spin"/>Guardando...</span> : "Guardar borrador"}
          </button>

          <button
            type="button"
            disabled={loading || (pagina && !puedeEnviar)}
            onClick={() => {
              if (!pagina) { void saveSubmission("submit"); return; }
              if (!autoria) { setMessage("Confirma la declaración de autoría antes de enviar."); return; }
              modal.current?.showModal();
            }}
            className={pagina ? "min-h-12 cursor-pointer rounded-lg bg-[#165dcc] px-7 text-sm font-semibold text-white transition-[scale,box-shadow] hover:shadow-md motion-safe:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60" : "rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60"}
          >
            {pagina && loading && accionActual === "submit" ? <span role="status" className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin"/>Enviando…</span> : pagina ? "Enviar solución" : "Enviar entrega"}
          </button>
        </div>
        {pagina && !puedeEnviar && !enviada && <p className="text-right text-xs text-slate-500">Completa la URL, la documentación, la justificación y el problema investigado, y acepta la declaración para enviar.</p>}

      </fieldset>
        {message && !(pagina && errorConexion) && (
          <p role="status" className="text-sm text-gray-700">
            {message}
          </p>
        )}
      {pagina && <dialog ref={modal} aria-labelledby="titulo-confirmar-entrega" className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-[520px] rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]">
        <div className="flex items-start justify-between gap-4"><h3 id="titulo-confirmar-entrega" className="flex items-center gap-3 text-lg font-bold"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-700">?</span>Confirmar entrega</h3><button type="button" aria-label="Cerrar modal" onClick={() => modal.current?.close()} className="rounded p-1 focus-visible:outline-2 focus-visible:outline-blue-700">✕</button></div>
        <p className="mt-4 text-sm leading-relaxed">Al enviar, ya no podrás editar esta versión. ¿Quieres continuar?</p>
        <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-3"><button type="button" autoFocus onClick={() => modal.current?.close()} className="min-h-12 rounded-lg border border-slate-300 px-5 text-sm focus-visible:outline-2 focus-visible:outline-blue-700">Cancelar</button><button type="button" disabled={loading || enviada} onClick={() => { modal.current?.close(); void saveSubmission("submit"); }} className="min-h-12 rounded-lg bg-[#165dcc] px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">Confirmar envío</button></div>
      </dialog>}
    </section>
  );
}
