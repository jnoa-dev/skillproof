"use client";

import { useState } from "react";
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
};

export default function SubmissionForm({ challengeId, draft }: Props) {
  const router = useRouter();
  const [submissionId, setSubmissionId] = useState(draft?.id ?? null);
  const [repoUrl, setRepoUrl] = useState(draft?.github_repo_url ?? "");
  const [documentation, setDocumentation] = useState(draft?.documentation ?? "");
  const [justification, setJustification] = useState(draft?.justification ?? "");
  const [problemDescription, setProblemDescription] = useState(
    draft?.problem_description ?? ""
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveSubmission(action: "draft" | "submit") {
    setMessage("");

    if (action === "submit") {
      const isGithubUrl =
        /^https:\/\/(www\.)?github\.com\/[^/]+\/[^/?#]+(\.git)?\/?$/i.test(
          repoUrl.trim()
        );

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
        setMessage(result.error ?? "No se pudo guardar la entrega.");
        return;
      }

      if (result.id) {
        setSubmissionId(result.id);
      }

      if (action === "submit") {
        setMessage("Entrega enviada correctamente.");
        router.refresh();
      } else {
        setMessage("Borrador guardado.");
      }
    } catch {
      setMessage("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <h2 className="text-xl font-semibold text-gray-900">Tu entrega</h2>
      <p className="mt-2 text-sm text-gray-600">
        Guarda un borrador para continuar después o envía cuando esté completo.
      </p>

      <div className="mt-6 space-y-5">
        <label className="block text-sm font-medium text-gray-700">
          URL del repositorio público de GitHub
          <input
            type="url"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/usuario/proyecto"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Documentación de la solución
          <textarea
            value={documentation}
            onChange={(event) => setDocumentation(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Justificación de tus decisiones técnicas
          <textarea
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          ¿Qué problema encontraste y cómo lo investigaste?
          <textarea
            value={problemDescription}
            onChange={(event) => setProblemDescription(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => saveSubmission("draft")}
            className="rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-800 disabled:opacity-60"
          >
            Guardar borrador
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => saveSubmission("submit")}
            className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            Enviar entrega
          </button>
        </div>

        {message && (
          <p role="status" className="text-sm text-gray-700">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}