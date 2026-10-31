// Adaptación defensiva del contrato público: nunca se consulta una tabla privada.
export function registro(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? valor as Record<string, unknown> : {};
}

export function texto(...valores: unknown[]): string {
  return valores.find((valor): valor is string => typeof valor === "string" && valor.trim().length > 0)?.trim() ?? "";
}

export function enlacePublico(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".") ||
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname) ||
      /^[\d.]+$/.test(url.hostname) || /\.(local|internal)$/i.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export function adaptarPasaporte(valor: unknown) {
  const raiz = registro(Array.isArray(valor) && valor.length === 1 ? valor[0] : valor);
  const evaluaciones = Array.isArray(raiz.evaluations)
    ? raiz.evaluations.map(registro)
    : [];
  const evaluacion = registro(raiz.evaluation ?? evaluaciones[0]);
  const alumno = registro(raiz.student ?? raiz.profile);
  const desafio = registro(raiz.challenge);
  const evaluador = registro(raiz.evaluator ?? evaluacion.evaluator);
  const evidencia = registro(raiz.evidence ?? raiz.submission);
  const lista =
    raiz.competencies ??
    raiz.scores ??
    raiz.criteria ??
    evaluacion.criteria;

  return {
    nombre: texto(alumno.display_name, alumno.name, raiz.student_name, raiz.display_name),
    desafio: texto(desafio.title, raiz.challenge_title, evaluacion.challenge_title),
    resumen: texto(raiz.recruiter_summary, raiz.summary_for_recruiters),
    feedback: texto(evaluacion.summary, raiz.feedback, raiz.evaluation_summary),
    defensa: texto(raiz.defense_summary, raiz.defense_and_adaptation),
    evaluador: texto(evaluador.display_name, evaluador.name, raiz.evaluator_name),
    fecha: texto(raiz.published_at, evaluacion.published_at),
    evaluado:
      evaluacion.status === "finalized" ||
      raiz.evaluation_status === "finalized" ||
      evaluaciones.length > 0,
    repositorio: enlacePublico(evidencia.github_repo_url ?? raiz.github_repo_url),
    documentacion: enlacePublico(
      evidencia.documentation_url ??
        evidencia.documentation ??
        raiz.documentation_url
    ),
    competencias: Array.isArray(lista)
      ? lista
          .map(registro)
          .map((item) => {
            const criterio = registro(item.criterion);
            return {
              titulo: texto(item.title, item.criterion_title, criterio.title),
              descripcion: texto(item.description, criterio.description),
              comentario: texto(item.notes, item.comment),
              puntuacion:
                typeof item.score === "number" && Number.isFinite(item.score)
                  ? item.score
                  : null,
              maximo:
                typeof (item.max_score ?? criterio.max_score) === "number" &&
                Number.isFinite(item.max_score ?? criterio.max_score)
                  ? ((item.max_score ?? criterio.max_score) as number)
                  : null,
            };
          })
          .filter((item) => item.titulo)
      : [],
  };
}
