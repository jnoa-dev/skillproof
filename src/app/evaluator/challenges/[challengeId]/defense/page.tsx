import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/defense/model";
import DefenseConfiguration from "@/components/defense/configuration";
import { LoadingDefense } from "@/components/defense/shared";
import { AccesoEvaluador } from "@/components/evaluator/states";
export default function Page({ params }: { params: Promise<{ challengeId: string }> }) { return <Suspense fallback={<main className="p-8"><LoadingDefense/></main>}><Content params={params}/></Suspense>; }
async function Content({ params }: { params: Promise<{ challengeId: string }> }) {
  await connection();
  const { challengeId } = await params;
  if (!uuid(challengeId)) notFound();
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const profile = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile.error || !profile.data || !["evaluator", "admin"].includes(profile.data.role)) return <AccesoEvaluador error={Boolean(profile.error)}/>;
  return <div className="min-h-screen bg-[#f7f9fc] text-[#14263d]"><header className="border-b border-slate-200 bg-white p-5"><nav aria-label="Navegación del evaluador" className="mx-auto flex max-w-[1200px] gap-8 text-sm"><Link href="/evaluator" className="font-bold">SKILLPROOF</Link><Link href="/evaluator">Inicio</Link><Link href="/evaluator/submissions">Entregas por evaluar</Link><Link href="/account" className="ml-auto">Mi cuenta</Link></nav></header><main className="mx-auto max-w-[1200px] px-6 py-8"><DefenseConfiguration challengeId={challengeId}/></main></div>;
}
