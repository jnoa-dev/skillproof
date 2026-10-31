export type DefenseQuestion = { id: string; requirement: string; prompt: string };
export type DefenseData = {
  slug: string; name: string; role: string; title: string; description: string;
  questions: DefenseQuestion[];
  submission: { id: string; status: string; github_repo_url: string | null; updated_at: string | null } | null;
};
export function questionsFrom(requirements: string[]): DefenseQuestion[] {
  return requirements.map((requirement, index) => ({
    id: String(index + 1), requirement,
    prompt: "¿Cómo cumpliste este requisito? Explica tus decisiones, las herramientas utilizadas y la evidencia en tu código.",
  }));
}
