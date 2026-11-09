export type EntregaPanel = {
  id: string;
  candidate_name: string | null;
  challenge_id: string;
  challenge_title: string | null;
  created_at: string | null;
  updated_at: string | null;
  evaluation_status: "draft" | "finalized" | null;
  evaluation_updated_at: string | null;
  own_evaluation: boolean;
};

export type FiltroEstado = "pending" | "draft" | "finalized" | "all";
export type OrdenPanel = "recent" | "oldest" | "name" | "status";
export const nombreCandidato = (fila: EntregaPanel) => fila.candidate_name?.trim() || "Nombre no disponible";
export const tituloDesafio = (fila: EntregaPanel) => fila.challenge_title?.trim() || "Desafío no disponible";
const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
const fecha = (valor: string | null) => valor && Number.isFinite(Date.parse(valor)) ? Date.parse(valor) : 0;

export function filtrarEntregas(filas: EntregaPanel[], estado: FiltroEstado, busqueda: string, desafio: string, orden: OrdenPanel) {
  const consulta = normalizar(busqueda);
  const posiciones = { pending: 0, draft: 1, finalized: 2 };
  return filas.filter(fila =>
    (estado === "all" || (fila.evaluation_status || "pending") === estado) &&
    (!desafio || fila.challenge_id === desafio) &&
    (!consulta || consulta.split(/\s+/).every(palabra => normalizar(`${nombreCandidato(fila)} ${tituloDesafio(fila)}`).includes(palabra))),
  ).sort((a, b) => {
    let diferencia = 0;
    if (orden === "name") diferencia = nombreCandidato(a).localeCompare(nombreCandidato(b), "es");
    else if (orden === "status") diferencia = posiciones[a.evaluation_status || "pending"] - posiciones[b.evaluation_status || "pending"];
    else diferencia = orden === "oldest" ? fecha(a.created_at) - fecha(b.created_at) : fecha(b.created_at) - fecha(a.created_at);
    return diferencia || a.id.localeCompare(b.id);
  });
}

export function evaluacionEnCurso(filas: EntregaPanel[]) {
  return filas.filter(fila => fila.own_evaluation && fila.evaluation_status === "draft")
    .sort((a, b) => fecha(b.evaluation_updated_at) - fecha(a.evaluation_updated_at))[0] || null;
}
