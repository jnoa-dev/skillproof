import { Suspense } from "react";
import { notFound } from "next/navigation";
import WorkspaceShell from "@/components/evaluator/workspace-shell";
import CandidatesView from "@/components/evaluator/candidates-view";
import { LoadingDefense } from "@/components/defense/shared";
import { uuid } from "@/lib/defense/model";
export default function Page({ params }: { params: Promise<{ candidateId: string }> }) { return <Suspense fallback={<main className="p-8"><LoadingDefense/></main>}><Content params={params}/></Suspense>; }
async function Content({ params }: { params: Promise<{ candidateId: string }> }) { const { candidateId } = await params; if (!uuid(candidateId)) notFound(); return <WorkspaceShell section="candidates"><CandidatesView candidateId={candidateId}/></WorkspaceShell>; }
