import { Suspense } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentDefense from "@/components/defense/student";
import { LoadingDefense } from "@/components/defense/shared";
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export default function Page({ params }: { params: Promise<{ slug: string }> }) { return <Suspense fallback={<main className="min-h-screen bg-[#f7f9fc] p-8"><LoadingDefense/></main>}><Content params={params}/></Suspense>; }
async function Content({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  const challenge = await db.from("challenges").select("id, title, slug").eq("slug", slug).maybeSingle();
  if (challenge.error) return <main role="alert" className="p-12">No pudimos cargar el desafío. <Link href="/dashboard" className="text-blue-700 underline">Volver al dashboard</Link></main>;
  if (!challenge.data) notFound();
  const submission = await db.from("submissions").select("id, github_repo_url").eq("user_id", data.user.id).eq("challenge_id", challenge.data.id).eq("status", "submitted").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const path = `/challenges/${encodeURIComponent(slug)}`;
  return <div className={`${inter.className} flex min-h-screen flex-col bg-[#f7f9fc] text-[#14263d]`}><header className="border-b border-slate-200 bg-white"><nav aria-label="Navegación principal" className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center gap-6 px-8 text-sm"><Link href="/dashboard" className="mr-4 text-xl font-bold">SKILLPROOF</Link><Link href="/dashboard">Dashboard</Link><Link href={path} className="text-blue-700">Mi desafío</Link><Link href={`${path}/submission`}>Mi entrega</Link><Link href="/account" className="ml-auto">Mi cuenta</Link></nav></header><main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8"><Link href={path} className="mb-6 inline-block text-sm text-blue-700">← Mi desafío</Link>{submission.data && !submission.error ? <StudentDefense submissionId={submission.data.id} title={challenge.data.title} repository={submission.data.github_repo_url} challengePath={path}/> : <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold">{submission.error ? "No pudimos verificar tu entrega" : "Primero envía tu solución"}</h1><p className="mt-3 text-sm text-slate-600">La defensa técnica corresponde a una entrega de código enviada.</p><Link href={`${path}/submission`} className="mt-6 inline-block text-blue-700 underline">Ir a mi entrega →</Link></section>}</main><footer className="border-t border-slate-200 bg-white px-8 py-5 text-xs text-slate-600">© SKILLPROOF</footer></div>;
}
