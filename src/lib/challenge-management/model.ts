export type CriterionDraft = { title: string; description: string; max_score: number; weight: number };
export type ChallengeDraft = { id: string | null; version: number; title: string; slug: string; description: string; context: string; difficulty: string; requirements: string[]; deliverables: string[]; is_active: boolean; criteria: CriterionDraft[] };
export const emptyChallenge = (): ChallengeDraft => ({ id: null, version: 0, title: "", slug: "", description: "", context: "", difficulty: "", requirements: [], deliverables: [], is_active: false, criteria: [] });
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function slugFromTitle(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30).replace(/-$/, ""); }
export function validateChallenge(value: ChallengeDraft, activate: boolean) {
  const errors: Record<string, string> = {};
  if (!value || typeof value !== "object") return { form: "Datos inválidos." };
  if (typeof value.title !== "string" || !value.title.trim() || value.title.length > 80) errors.title = "Ingresa un título de hasta 80 caracteres.";
  if (typeof value.slug !== "string" || value.slug.length < 3 || value.slug.length > 30 || !slugPattern.test(value.slug)) errors.slug = "Usa de 3 a 30 caracteres: minúsculas, números y guiones, sin guiones consecutivos ni en los extremos.";
  for (const [key, max] of [["description", 160], ["context", 1000]] as const) if (typeof value[key] !== "string" || value[key].length > max || (activate && !value[key].trim())) errors[key] = `Completa este campo (hasta ${max} caracteres).`;
  if (!["", "beginner", "intermediate", "advanced"].includes(value.difficulty) || (activate && !value.difficulty)) errors.difficulty = "Selecciona un nivel.";
  for (const key of ["requirements", "deliverables"] as const) if (!Array.isArray(value[key]) || value[key].length > 50 || value[key].some(item => typeof item !== "string" || !item.trim() || item.length > 1000) || (activate && !value[key].length)) errors[key] = "Incluye al menos un elemento válido para activar (máximo 50).";
  if (!Array.isArray(value.criteria) || value.criteria.length > 20 || value.criteria.some(c => !c || typeof c.title !== "string" || !c.title.trim() || c.title.length > 120 || typeof c.description !== "string" || c.description.length > 2000 || !Number.isInteger(c.max_score) || c.max_score < 1 || c.max_score > 100 || !Number.isInteger(c.weight) || c.weight < 1 || c.weight > 100) || (activate && (!value.criteria.length || value.criteria.reduce((sum, c) => sum + c.weight, 0) !== 100))) errors.criteria = "Completa la rúbrica. Los pesos deben sumar 100 % para activar.";
  return errors;
}
