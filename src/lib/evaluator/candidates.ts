export type CandidateEntry = {
  submission_id: string; candidate_id: string; name: string | null; challenge_id: string; challenge_title: string | null;
  updated_at: string | null; evaluation_status: "draft" | "finalized" | null; total_score: number | null;
  interview_status: "draft" | "finalized" | null;
  scores: { title: string; score: number; max_score: number | null; notes: string }[];
};
export const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
export function filterCandidates(rows: CandidateEntry[], search: string, challenge: string, evaluation: string, interview: string, order: string) {
  return rows.filter(row => (!challenge || row.challenge_id === challenge) && (!evaluation || (row.evaluation_status || "unknown") === evaluation) && (!interview || (row.interview_status || "unknown") === interview) && normalize(`${row.name || ""} ${row.challenge_title || ""} ${row.candidate_id}`).includes(normalize(search.trim())))
    .sort((a, b) => order === "name" ? (a.name || "").localeCompare(b.name || "", "es") || a.submission_id.localeCompare(b.submission_id) : (Date.parse(b.updated_at || "") || 0) - (Date.parse(a.updated_at || "") || 0) || a.submission_id.localeCompare(b.submission_id));
}
export function csvCell(value: unknown) { const text = String(value ?? ""); return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`; }
