
import { LoadingState } from "@/components/ui/loading-state";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InterviewProfileProvider, type InterviewProfile } from "./_components/profile-context";
import "./interviews.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
export const metadata: Metadata = {
  title: "Entrevistas | SkillProof",
  description: "Historial y revisión humana de entrevistas técnicas de SkillProof.",
};

type AccountResult = { status: "ready"; profile: InterviewProfile } | { status: "signed-out" } | { status: "error" };

async function loadAccount(): Promise<AccountResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error?.name === "AuthSessionMissingError") return { status: "signed-out" };
    if (error) return { status: "error" };
    if (!data.user) return { status: "signed-out" };
    const profile = await supabase.from("profiles").select("display_name, role").eq("id", data.user.id).maybeSingle();
    if (profile.error) return { status: "error" };
    return {
      status: "ready",
      profile: {
        name: typeof profile.data?.display_name === "string" ? profile.data.display_name.trim() : "",
        role: typeof profile.data?.role === "string" ? profile.data.role : null,
      },
    };
  } catch {
    return { status: "error" };
  }
}

async function AuthenticatedInterviews({ children }: { children: React.ReactNode }) {
  await connection();
  const account = await loadAccount();
  if (account.status === "signed-out") redirect("/login");
  if (account.status === "error") {
    return <main className="mx-auto max-w-xl px-6 py-16"><section role="alert" className="rounded-xl border border-red-200 bg-white p-6"><h1 className="text-xl font-bold">No pudimos cargar tu cuenta</h1><p className="mt-3 text-sm text-slate-600">Reintenta para recuperar tu sesión y perfil antes de continuar.</p><a href="/interviews" className="mt-4 inline-flex min-h-12 items-center rounded-lg border border-blue-700 px-5 text-sm font-semibold text-blue-700">Reintentar</a></section></main>;
  }
  if (account.profile.role === "evaluator" || account.profile.role === "admin") redirect("/evaluator/interviews");
  if (account.profile.role !== "student") redirect("/dashboard");
  return <InterviewProfileProvider profile={account.profile}>{children}</InterviewProfileProvider>;
}

export default function InterviewsLayout({ children }: { children: React.ReactNode }) {
  return <div lang="es" className={`${inter.className} interviews min-h-screen bg-[#f8fafc] text-[#17212f]`}>
    <Suspense fallback={<LoadingState fullPage label="Cargando entrevistas…"/>}>
      <AuthenticatedInterviews>{children}</AuthenticatedInterviews>
    </Suspense>
  </div>;
}
