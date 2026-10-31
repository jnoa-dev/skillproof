import Link from "next/link";
import { AbrirPasaporte } from "@/components/passport/acciones";

export default function PassportIndex() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-6 py-12 text-slate-900"><section className="w-full max-w-lg space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"><p className="text-sm font-semibold">SKILLPROOF</p><h1 className="text-2xl font-bold">Pasaporte público</h1><p className="text-sm leading-relaxed text-slate-600">Consulta un pasaporte de competencias con su enlace o código público. Solo están disponibles los datos autorizados para publicación.</p><AbrirPasaporte/><Link href="/dashboard" className="inline-block text-sm text-blue-700 underline">Volver al dashboard</Link></section></main>;
}
