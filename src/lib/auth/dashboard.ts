// El rol procede de profiles, nunca de metadatos editables o de la URL.
export function dashboardForRole(role: unknown): "/dashboard" | "/evaluator" | "/recruiter" | null {
  if (role === "student") return "/dashboard";
  if (role === "evaluator" || role === "admin") return "/evaluator";
  if (role === "recruiter") return "/recruiter";
  return null;
}
