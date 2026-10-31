import { Suspense } from "react";
import { notFound } from "next/navigation";
import WorkspaceShell from "@/components/evaluator/workspace-shell";
import ChallengeEditor from "@/components/evaluator/challenge-editor";
import { LoadingDefense } from "@/components/defense/shared";
import { uuid } from "@/lib/defense/model";
export default function Page({ params }: { params: Promise<{ challengeId: string }> }) { return <Suspense fallback={<main className="p-8"><LoadingDefense/></main>}><Content params={params}/></Suspense>; }
async function Content({ params }: { params: Promise<{ challengeId: string }> }) { const { challengeId } = await params; if (!uuid(challengeId)) notFound(); return <WorkspaceShell section="challenges" adminOnly><ChallengeEditor challengeId={challengeId}/></WorkspaceShell>; }
