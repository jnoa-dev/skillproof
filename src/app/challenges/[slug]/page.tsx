import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import SubmissionForm from "@/components/challenges/submission-form";

export default function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-8">Cargando desafío...</p>}>
      <ChallengeContent params={params} />
    </Suspense>
  );
}

async function ChallengeContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();

  const { slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (typeof userId !== "string") {
    redirect("/login");
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, title, description, difficulty, requirements, deliverables")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!challenge) {
    notFound();
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "id, status, github_repo_url, documentation, justification, problem_description"
    )
    .eq("user_id", userId)
    .eq("challenge_id", challenge.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const draft = submission?.status === "draft" ? submission : null;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <Link href="/dashboard" className="text-sm text-blue-700 underline">
          ← Volver al dashboard
        </Link>

        <p className="mt-6 text-sm font-medium text-blue-700">
          SkillProof · {challenge.difficulty}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {challenge.title}
        </h1>
        <p className="mt-4 text-gray-700">{challenge.description}</p>

        <h2 className="mt-8 text-xl font-semibold">Requisitos</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">
          {(challenge.requirements ?? []).map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Entregables</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">
          {(challenge.deliverables ?? []).map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>

        {submission?.status === "submitted" ? (
          <p className="mt-10 rounded-lg bg-green-50 p-4 text-green-900">
            Ya enviaste tu entrega. Quedó cerrada para edición.
          </p>
        ) : (
          <SubmissionForm challengeId={challenge.id} draft={draft} />
        )}
      </article>
    </main>
  );
}