import { Suspense } from "react";
import WorkspaceShell from "@/components/evaluator/workspace-shell";
import ChallengeEditor from "@/components/evaluator/challenge-editor";
import { LoadingDefense } from "@/components/defense/shared";
export default function Page() { return <Suspense fallback={<main className="p-8"><LoadingDefense/></main>}><WorkspaceShell section="challenges" adminOnly><ChallengeEditor/></WorkspaceShell></Suspense>; }
