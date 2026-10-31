import { Suspense } from "react";
import WorkspaceShell from "@/components/evaluator/workspace-shell";
import ChallengeList from "@/components/evaluator/challenge-list";
import { LoadingDefense } from "@/components/defense/shared";
export default function Page() { return <Suspense fallback={<main className="p-8"><LoadingDefense/></main>}><WorkspaceShell section="challenges" adminOnly><ChallengeList/></WorkspaceShell></Suspense>; }
