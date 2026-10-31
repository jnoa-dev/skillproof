// Definición visual de la rúbrica; no representa resultados ni criterios recibidos del servidor.
export const criteria = [
  { id: "communication", title: "Claridad en Comunicación Técnica", description: "Capacidad para explicar decisiones arquitectónicas, algoritmos y estructuras con precisión y claridad." },
  { id: "problem-solving", title: "Resolución de Problemas en Vivo", description: "Análisis de problemas, razonamiento en voz alta y respuesta ante escenarios técnicos imprevistos." },
  { id: "rigor", title: "Alineación Cultural y Rigor", description: "Receptividad al feedback, colaboración y rigor en el análisis de la solución presentada." },
] as const;
export type CriterionId = (typeof criteria)[number]["id"];
export type Level = 1 | 2 | 3 | 4;
export const levels: { value: Level; label: string }[] = [
  { value: 1, label: "Inicial" }, { value: 2, label: "En desarrollo" },
  { value: 3, label: "Competente" }, { value: 4, label: "Sobresaliente" },
];

// Contrato de presentación para una futura fuente autenticada.
// "ready" solo debe usarse después de una consulta real satisfactoria.
export type Interview = {
  id: string;
  title: string;
  evaluatorName: string | null;
  date: string | null;
  responsePending: boolean;
  feedback: { summary: string | null; recommendation: string | null; criteria: { id: string; title: string; level: number | null; observation: string | null }[] } | null;
  aiResult: string | null;
};
export type InterviewSource =
  | { status: "disconnected" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; interviews: Interview[] };
