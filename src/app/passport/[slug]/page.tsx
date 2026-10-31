import { Suspense } from "react";
import { Inter } from "next/font/google";
import VistaPasaporte from "@/components/passport/vista";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function PassportPage({ params }: { params: Promise<{ slug: string }> }) {
  return <div className={inter.className}><Suspense fallback={<main aria-busy="true" className="flex min-h-screen items-center justify-center gap-3 bg-[#f8f9ff] p-8 text-sm text-slate-600"><span aria-hidden="true" className="size-6 rounded-full border-2 border-blue-100 border-t-blue-700 motion-safe:animate-spin"/><span role="status">Cargando pasaporte...</span></main>}><Contenido params={params}/></Suspense></div>;
}

async function Contenido({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <VistaPasaporte key={slug} slug={slug}/>;
}
