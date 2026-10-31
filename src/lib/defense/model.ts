export type DefenseQuestion = { requirement_index: number; requirement: string; prompt: string; enabled: boolean };
export type DefenseConfig = { enabled: boolean; duration_minutes: number; max_exits: number; block_paste: boolean; instructions: string; questions: DefenseQuestion[]; weights: { code: number; explanation: number; clarity: number } };
export type DefenseSession = { id: string; status: "in_progress" | "submitted"; started_at: string; expires_at: string; submitted_at: string | null; submit_reason: "manual" | "time" | "exits" | null; questions: DefenseQuestion[]; config: DefenseConfig; answers: Record<string, string>; exits: number; paste_attempts: number; revision: number };
export type DefenseData = { config: DefenseConfig | null; session: DefenseSession | null; server_time: string };
export const uuid = (valor: unknown): valor is string => typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
export function defaultDefense(requirements: string[]): DefenseConfig {
  return { enabled: false, duration_minutes: 30, max_exits: 3, block_paste: true, instructions: "Responde con tus propias palabras sobre el código que entregaste. No uses asistentes de IA ni ayuda de otras personas. El tiempo no se pausa y se registran las salidas de la página.", weights: { code: 40, explanation: 35, clarity: 25 }, questions: requirements.map((requirement, requirement_index) => ({ requirement_index, requirement, prompt: "¿Cómo cumpliste este requisito? Explica qué hiciste, qué usaste y cómo comprobaste que funciona.", enabled: true })) };
}
export function validateConfig(config: DefenseConfig) {
  if (!config || ![20, 30, 45].includes(config.duration_minutes) || ![1, 2, 3].includes(config.max_exits) || typeof config.enabled !== "boolean" || typeof config.block_paste !== "boolean" || typeof config.instructions !== "string" || config.instructions.length > 10000) return "Revisa la duración, las reglas y las indicaciones.";
  if (!Array.isArray(config.questions) || !config.questions.length || config.questions.length > 50 || !config.questions.some(q => q?.enabled === true) || config.questions.some(q => !q || !Number.isInteger(q.requirement_index) || q.requirement_index < 0 || typeof q.enabled !== "boolean" || typeof q.prompt !== "string" || !q.prompt.trim() || q.prompt.length > 2000)) return "Incluye al menos un requisito y una pregunta válida por requisito.";
  if (new Set(config.questions.map(q => q.requirement_index)).size !== config.questions.length) return "Hay requisitos repetidos.";
  if (!config.weights || Object.values(config.weights).length !== 3 || Object.values(config.weights).some(w => !Number.isInteger(w) || w < 0 || w > 100) || config.weights.code + config.weights.explanation + config.weights.clarity !== 100) return "Los pesos deben ser enteros entre 0 y 100 y sumar 100 %.";
  return null;
}
export function remainingSeconds(expiresAt: string, serverNow: number) { return Math.max(0, Math.ceil((Date.parse(expiresAt) - serverNow) / 1000)); }
export function answeredCount(questions: DefenseQuestion[], answers: Record<string, string>) { return questions.filter((_, i) => (answers[String(i)] || "").trim().length >= 80).length; }
export function validAnswers(answers: unknown): answers is Record<string, string> {
  return answers !== null && typeof answers === "object" && !Array.isArray(answers) && Object.keys(answers).length <= 50 && Object.entries(answers).every(([key, value]) => /^(0|[1-9]\d?)$/.test(key) && typeof value === "string" && value.length <= 10000);
}
