import { Suspense } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import PerfilCuenta from "@/components/account/profile";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function CuentaPage() {
  return <Suspense fallback={<main aria-busy="true" aria-label="Cargando mi cuenta" className="min-h-screen bg-[#f8f9ff] p-8"><div className="mx-auto max-w-[1120px] space-y-6"><p role="status" className="text-sm text-slate-600">Cargando tu cuenta…</p><div aria-hidden="true" className="h-12 w-48 rounded bg-slate-200 carga-animada"/><div aria-hidden="true" className="h-96 max-w-[720px] rounded-xl bg-slate-200 carga-animada"/></div></main>}><Cuenta/></Suspense>;
}

async function Cuenta() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const [perfil, desafio] = await Promise.all([
    supabase.from("profiles").select("display_name, role").eq("id", data.user.id).maybeSingle(),
    supabase.from("challenges").select("slug").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  const nombre = perfil.data?.display_name?.trim() || "";
  const rol = perfil.data?.role === "admin" ? "Administrador" : perfil.data?.role === "evaluator" ? "Evaluador" : perfil.data?.role === "student" ? "Estudiante" : "Rol no disponible";
  const evaluador = perfil.data?.role === "evaluator" || perfil.data?.role === "admin";
  const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte: string) => parte[0]).join("").toUpperCase() || "•";
  const ruta = desafio.data ? `/challenges/${encodeURIComponent(desafio.data.slug)}` : null;
  return <div className={`${inter.className} flex min-h-screen flex-col bg-[#f8f9ff] text-[#14263d]`}>
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 sm:px-8"><Link href={evaluador ? "/evaluator" : "/dashboard"} className="text-xl font-bold tracking-tight">SKILLPROOF</Link><nav aria-label="Navegación principal" className="flex flex-wrap gap-6 py-3 text-sm"><Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>{evaluador ? <Link href="/evaluator" className="hover:text-blue-700">Entregas disponibles</Link> : ruta && <><Link href={ruta} className="hover:text-blue-700">Mi desafío</Link><Link href={`${ruta}/submission`} className="hover:text-blue-700">Mi entrega</Link></>}</nav><Link href="/account" aria-current="page" aria-label="Mi cuenta" className="my-2 flex items-center gap-2 rounded-lg border border-blue-700 bg-blue-50 px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-blue-800 text-xs font-semibold text-white">{iniciales}</span><span><span className="block font-medium">{nombre || "Mi cuenta"}</span><span className="block text-xs text-slate-600">{rol}</span></span></Link></div></header>
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 pt-6 pb-16 sm:px-8"><h1 className="text-[32px] font-bold tracking-tight">Mi cuenta</h1><p className="mt-2 text-sm text-slate-600">Administra tus datos, tu seguridad y lo que se muestra en tu pasaporte.</p>{perfil.error || !perfil.data ? <section role="alert" className="mt-8 max-w-[720px] rounded-xl border border-red-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">No pudimos cargar tu perfil</h2><p className="mt-2 text-sm text-slate-600">Reintenta para recuperar tus datos antes de editarlos.</p><a href="/account" className="mt-4 inline-block rounded-lg border border-blue-600 px-4 py-2 text-sm text-blue-700">Reintentar</a></section> : <PerfilCuenta key={data.user.id} nombreInicial={nombre} correo={data.user.email || ""} confirmado={Boolean(data.user.email_confirmed_at)} rol={rol}/>}</main>
    <footer className="border-t border-slate-200 bg-white px-6 py-5 text-xs text-slate-500"><div className="mx-auto flex max-w-[1280px] justify-between gap-4"><span>© {new Date().getFullYear()} SKILLPROOF</span><div className="flex gap-3"><button disabled title="Términos aún no disponible">Términos</button><span>·</span><button disabled title="Soporte aún no disponible">Soporte</button></div></div></footer>
  </div>;
}
