
import { LoadingState } from "@/components/ui/loading-state";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import VistaPasaporte from "@/components/passport/vista";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function PassportPage({ params }: { params: Promise<{ slug: string }> }) {
  return <div className={inter.className}><Suspense fallback={<LoadingState fullPage label="Cargando pasaporte…"/>}><Contenido params={params}/></Suspense></div>;
}

async function Contenido({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <VistaPasaporte key={slug} slug={slug}/>;
}
