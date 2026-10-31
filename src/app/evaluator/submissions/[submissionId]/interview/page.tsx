import { Suspense } from "react";
import { notFound } from "next/navigation";
import WorkspaceShell from "@/components/evaluator/workspace-shell";
import InterviewScreen from "@/components/evaluator/interview-screen";
import { LoadingDefense } from "@/components/defense/shared";
import { AccesoEvaluador } from "@/components/evaluator/states";
import { staffAccess } from "@/lib/evaluator/access";
import { uuid } from "@/lib/defense/model";
export default function Page({ params }: { params: Promise<{ submissionId: string }> }) { return <Suspense fallback={<main className="p-8"><LoadingDefense/></main>}><Content params={params}/></Suspense>; }
async function Content({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params; if (!uuid(submissionId)) notFound();
  const access = await staffAccess(); if (access.error) return <AccesoEvaluador/>;
  const evaluation = await access.db.from("evaluations").select("evaluator_id").eq("submission_id", submissionId).maybeSingle();
  if (evaluation.error || (evaluation.data && evaluation.data.evaluator_id !== access.user && access.profile.role !== "admin")) return <AccesoEvaluador error={Boolean(evaluation.error)}/>;
  const submission = await access.db.from("submissions").select("id, user_id, challenge_id, github_repo_url").eq("id", submissionId).eq("status", "submitted").maybeSingle();
  if (submission.error) return <AccesoEvaluador error/>;
  if (!submission.data) notFound();
  const row = submission.data;
  const [candidate, challenge] = await Promise.all([access.db.from("profiles").select("display_name").eq("id", row.user_id).maybeSingle(), access.db.from("challenges").select("title").eq("id", row.challenge_id).maybeSingle()]);
  return <WorkspaceShell section="interviews"><InterviewScreen submissionId={row.id} candidateId={row.user_id} candidateName={candidate.data?.display_name || "Nombre no disponible"} challengeTitle={challenge.data?.title || "Título no disponible"} repository={row.github_repo_url}/></WorkspaceShell>;
}
