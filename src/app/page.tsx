import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import SectionLink from "@/components/landing/section-link";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "SKILLPROOF · Demuestra lo que sabes hacer, con evidencia real",
  description: "Resuelve un desafío técnico, recibe una evaluación humana y comparte tu pasaporte de competencias con evidencia real.",
};

type ConsultaLanding = Promise<{ estado?: string | string[] }>;

export default function Home({ searchParams }: { searchParams: ConsultaLanding }) {
  return <Suspense fallback={<Landing/>}><EstadoLanding searchParams={searchParams}/></Suspense>;
}

async function EstadoLanding({ searchParams }: { searchParams: ConsultaLanding }) {
  const consulta = await searchParams;
  return <Landing mostrarEstados={consulta.estado === "hover"}/>;
}

function Landing({ mostrarEstados = false }: { mostrarEstados?: boolean }) {
  return <div data-landing-preview={mostrarEstados ? "hover" : undefined} className={`${inter.className} landing min-h-screen flex flex-col bg-[#F7F9FC] text-[#17212F] antialiased selection:bg-[#E8F0FD] selection:text-[#165DCC]`}>

<header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] h-16 flex items-center shadow-none">
<div className="max-w-[1200px] w-full mx-auto px-8 flex items-center justify-between">
<Link className="text-xl font-bold tracking-tight text-[#14263D] select-none" href="/">
        SKILLPROOF
      </Link>
<nav aria-label="Navegación principal" className="hidden md:flex items-center gap-8">
<SectionLink className="text-base text-[#17212F] font-medium h-11 flex items-center" href="#como-funciona">
          Cómo funciona
        </SectionLink>
<SectionLink className="text-base text-[#17212F] font-medium h-11 flex items-center" href="#pasaporte">
          Pasaporte
        </SectionLink>
<SectionLink className="text-base text-[#17212F] font-medium h-11 flex items-center" href="#preguntas">
          Preguntas
        </SectionLink>
<SectionLink className="text-base text-[#17212F] font-medium h-11 flex items-center" href="#equipo">
          Equipo
        </SectionLink>
</nav>
<div className="flex items-center gap-3">
<Link className="h-11 px-4 py-2 border border-[#165DCC] text-[#165DCC] font-semibold text-base rounded-lg flex items-center justify-center" href="/login">
          Iniciar sesión
        </Link>
<Link className="h-11 px-4 py-2 bg-[#165DCC] text-white font-semibold text-base rounded-lg flex items-center justify-center shadow-none" href="/login?mode=register">
          Crear cuenta
        </Link>
</div>
</div>
</header>
<main className="flex-1 overflow-clip">
<section className="relative bg-gradient-to-b from-[#F7F9FC] via-blue-50 to-[#E8F0FD] pt-16 pb-24 overflow-hidden">
<div className="absolute -top-24 -left-24 w-96 h-96 bg-[#E8F0FD] rounded-full filter blur-3xl opacity-60 pointer-events-none"></div>
<div className="absolute top-1/3 -right-20 w-80 h-80 bg-teal-50 rounded-full filter blur-3xl opacity-70 pointer-events-none"></div>
<div className="max-w-[1200px] mx-auto px-8 relative z-10">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
<div className="lg:col-span-6 flex flex-col justify-center">
<span className="text-xs uppercase tracking-wider font-semibold text-[#536174] mb-3">
              PASAPORTE DE COMPETENCIAS
            </span>
<h1 className="text-[48px] leading-[1.15] font-bold text-[#14263D] mb-4 tracking-tight">
              Demuestra lo que sabes hacer, con <span className="relative inline-block">evidencia real<span className="absolute bottom-1.5 left-0 w-full h-2 bg-[#087F8C]/40 rounded-full"></span></span>.
            </h1>
<p className="text-[18px] leading-[1.6] text-[#536174] mb-8 max-w-xl">
              Resuelve un desafío técnico, recibe una evaluación con rúbrica de una persona y comparte tu pasaporte de competencias con quien quieras.
            </p>
<div className="flex flex-wrap items-center gap-4 mb-6">
<Link data-landing-state="hero-crear" className="h-12 px-6 bg-[#165DCC] text-white font-semibold text-base rounded-lg inline-flex items-center justify-center gap-2 shadow-sm" href="/login?mode=register">
<span>Crear cuenta</span>
<svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</Link>
<SectionLink className="h-12 px-6 border border-[#165DCC] text-[#165DCC] font-semibold text-base rounded-lg inline-flex items-center justify-center bg-white/60" href="#ejemplo-pasaporte">
                Ver ejemplo de pasaporte
              </SectionLink>
</div>
<div className="flex items-center gap-2.5 text-sm text-[#536174] pt-2">
<span className="w-6 h-6 rounded-full bg-[#087F8C]/15 text-[#536174] flex items-center justify-center flex-shrink-0">
<svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</span>
<span>La IA apoya. La decisión de la evaluación es siempre humana.</span>
</div>
</div>
<div className="lg:col-span-6 relative flex justify-center items-center pt-4 lg:pt-0">
<div className="w-full max-w-[520px] relative" id="ejemplo-pasaporte">
<svg aria-hidden="true" focusable="false" className="w-full h-auto drop-shadow-sm select-none" fill="none" viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg">

<circle cx="270" cy="180" fill="#E8F0FD" r="160"></circle>
<circle cx="390" cy="100" fill="#F0F9FA" r="45"></circle>
<circle cx="130" cy="80" fill="#F0F9FA" r="28"></circle>

<g transform="translate(350, 45)">
<rect fill="#FFFFFF" filter="drop-shadow(0 4px 12px rgba(20,38,61,0.08))" height="44" rx="10" width="120"></rect>
<circle cx="24" cy="22" fill="#E8F0FD" r="12"></circle>
<path d="M19 22l3.5 3.5 7-7" stroke="#165DCC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
<rect fill="#14263D" height="5" rx="2.5" width="55" x="44" y="15"></rect>
<rect fill="#737785" height="4" rx="2" width="36" x="44" y="25"></rect>
</g>

<g transform="translate(90, 80)">
<rect fill="#FFFFFF" filter="drop-shadow(0 4px 12px rgba(20,38,61,0.08))" height="46" rx="12" width="46"></rect>
<circle cx="23" cy="23" fill="#F0F9FA" r="14"></circle>
<path d="M20 26a4 4 0 010-6l3-3a4 4 0 016 6l-1 1m-4 1a4 4 0 010 6l-3 3a4 4 0 01-6-6l1-1" stroke="#087F8C" strokeLinecap="round" strokeWidth="2"></path>
</g>

<rect fill="#14263D" height="14" rx="7" width="370" x="80" y="285"></rect>
<rect fill="#CBD5E1" height="65" rx="4" width="12" x="120" y="299"></rect>
<rect fill="#CBD5E1" height="65" rx="4" width="12" x="398" y="299"></rect>

<g transform="translate(195, 110)">

<ellipse cx="38" cy="56" fill="#5A3825" rx="14" ry="16" transform="rotate(-15 38 56)"></ellipse>
<ellipse cx="38" cy="56" fill="#D9826C" rx="8" ry="10" transform="rotate(-15 38 56)"></ellipse>
<ellipse cx="118" cy="56" fill="#5A3825" rx="14" ry="16" transform="rotate(15 118 56)"></ellipse>
<ellipse cx="118" cy="56" fill="#D9826C" rx="8" ry="10" transform="rotate(15 118 56)"></ellipse>

<ellipse cx="78" cy="135" fill="#EA7A26" rx="66" ry="55"></ellipse>
<ellipse cx="78" cy="82" fill="#EA7A26" rx="54" ry="46"></ellipse>

<path d="M62 48 C72 44, 84 44, 94 48 C100 66, 102 96, 92 118 C88 126, 88 152, 78 152 C68 152, 68 126, 64 118 C54 96, 56 66, 62 48 Z" fill="#FFF5E9"></path>
<ellipse cx="78" cy="138" fill="#FFF5E9" rx="36" ry="28"></ellipse>

<ellipse cx="55" cy="78" fill="#1A202C" rx="6" ry="7"></ellipse>
<circle cx="53" cy="75" fill="#FFFFFF" r="2.5"></circle>
<ellipse cx="101" cy="78" fill="#1A202C" rx="6" ry="7"></ellipse>
<circle cx="99" cy="75" fill="#FFFFFF" r="2.5"></circle>

<polygon fill="#5A3825" points="78,86 74,83 82,83"></polygon>
<path d="M74 88 Q78 92 82 88" fill="none" stroke="#5A3825" strokeLinecap="round" strokeWidth="2.5"></path>
<path d="M78 86 L78 89" stroke="#5A3825" strokeLinecap="round" strokeWidth="2"></path>

<ellipse cx="48" cy="146" fill="#EA7A26" rx="12" ry="10"></ellipse>
<ellipse cx="108" cy="146" fill="#EA7A26" rx="12" ry="10"></ellipse>


<path d="M60 40 L96 40 L91 52 L65 52 Z" fill="#14263D"></path>

<polygon fill="#1A2B42" points="78,16 122,34 78,50 34,34"></polygon>
<polygon fill="#223754" points="78,19 116,34 78,47 40,34"></polygon>
<circle cx="78" cy="34" fill="#F59E0B" r="3.5"></circle>

<path d="M78 34 Q106 36 108 52" fill="none" stroke="#F59E0B" strokeWidth="2.5"></path>
<polygon fill="#F59E0B" points="105,52 111,52 110,64 106,64"></polygon>
</g>

<g transform="translate(242, 218)">
<path d="M15 48 L75 48 L68 70 L8 70 Z" fill="#CBD5E1"></path>
<rect fill="#14263D" height="44" rx="4" width="62" x="14" y="5"></rect>
<rect fill="#E8F0FD" height="36" rx="2.5" width="54" x="18" y="9"></rect>
<path d="M28 24 L34 27 L28 30" stroke="#165DCC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></path>
<path d="M41 30 L52 30" stroke="#087F8C" strokeLinecap="round" strokeWidth="2.2"></path>
</g>
</svg>
<div data-landing-hover="true" className="relative lg:-mt-24 mx-auto max-w-[390px] bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-lg z-20">
<div className="flex justify-between items-start mb-4">
<div>
<h3 className="text-xl font-bold text-[#14263D] leading-tight">Alex Torres</h3>
<p className="text-sm text-[#536174] mt-0.5">Desafío: Sistema de Caché Distribuido</p>
</div>
<span className="text-xs font-semibold px-2.5 py-1 bg-[#E9EEF5] text-[#14263D] rounded border border-[#E2E8F0]">
                    EJEMPLO
                  </span>
</div>
<div className="mb-5">
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase bg-green-50 text-[#167347] border border-green-200">
<svg aria-hidden="true" focusable="false" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
                    EVALUADO
                  </span>
</div>
<div className="border-t border-[#E2E8F0] pt-3.5 mb-3.5">
<div className="flex justify-between items-baseline mb-2">
<span className="text-sm font-semibold text-[#14263D]">Arquitectura y modularidad</span>
<span className="text-xs font-medium text-[#536174]">3 de 4 · Competente</span>
</div>
<div className="grid grid-cols-4 gap-1.5 h-2">
<div className="bg-[#14263D] rounded-sm"></div>
<div className="bg-[#14263D] rounded-sm"></div>
<div className="bg-[#14263D] rounded-sm"></div>
<div className="bg-[#E2E8F0] rounded-sm"></div>
</div>
</div>
<div className="border-t border-[#E2E8F0] pt-3.5">
<div className="flex justify-between items-baseline mb-2">
<span className="text-sm font-semibold text-[#14263D]">Concurrencia y sincronización</span>
<span className="text-xs font-medium text-[#536174]">4 de 4 · Sobresaliente</span>
</div>
<div className="grid grid-cols-4 gap-1.5 h-2">
<div className="bg-[#14263D] rounded-sm"></div>
<div className="bg-[#14263D] rounded-sm"></div>
<div className="bg-[#14263D] rounded-sm"></div>
<div className="bg-[#14263D] rounded-sm"></div>
</div>
</div>
</div>
</div>
</div>
</div>
<div className="mt-16 bg-white border border-[#E2E8F0] rounded-[16px] shadow-lg p-6">
<div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] text-center">
<div className="p-3 flex flex-col items-center justify-center">
<span className="text-[28px] font-bold text-[#14263D] leading-none mb-1">1</span>
<span className="text-[14px] text-[#536174] font-medium">desafío disponible</span>
</div>
<div className="p-3 flex flex-col items-center justify-center">
<span className="text-[28px] font-bold text-[#14263D] leading-none mb-1">4</span>
<span className="text-[14px] text-[#536174] font-medium">pasos para tu pasaporte</span>
</div>
<div className="p-3 flex flex-col items-center justify-center">
<span className="text-[28px] font-bold text-[#14263D] leading-none mb-1">1 a 4</span>
<span className="text-[14px] text-[#536174] font-medium">escala de evaluación</span>
</div>
<div className="p-3 flex flex-col items-center justify-center">
<span className="text-[28px] font-bold text-[#14263D] leading-none mb-1">1</span>
<span className="text-[14px] text-[#536174] font-medium">enlace para compartir</span>
</div>
</div>
</div>
</div>
<div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden leading-none pointer-events-none">
<svg aria-hidden="true" focusable="false" className="w-full h-full text-white fill-current" preserveAspectRatio="none" viewBox="0 0 1200 32">
<path d="M0,32 Q600,0 1200,32 L1200,32 L0,32 Z"></path>
</svg>
</div>
</section>
<section className="bg-white py-20 relative">
<div className="max-w-[1200px] mx-auto px-8">
<h2 className="text-[32px] leading-tight font-bold text-[#14263D] text-center mb-14 max-w-3xl mx-auto">
          Un currículum cuenta lo que dices. Un pasaporte muestra lo que hiciste.
        </h2>
<div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col">
<div className="h-[180px] bg-[#E9EEF5] flex items-center justify-center relative overflow-hidden">
<svg aria-hidden="true" focusable="false" className="w-full h-full select-none" fill="none" viewBox="0 0 320 180">
<circle cx="160" cy="90" fill="#DFE7F0" r="72"></circle>

<g transform="translate(70, 38)">
<rect fill="#FFFFFF" filter="drop-shadow(0 2px 8px rgba(20,38,61,0.08))" height="104" rx="6" width="78"></rect>
<rect fill="#CBD5E1" height="6" rx="2" width="50" x="14" y="18"></rect>
<rect fill="#CBD5E1" height="4" rx="2" width="40" x="14" y="32"></rect>
<rect fill="#CBD5E1" height="4" rx="2" width="50" x="14" y="44"></rect>
<rect fill="#CBD5E1" height="4" rx="2" width="34" x="14" y="56"></rect>
<circle cx="20" cy="80" fill="#E2E8F0" r="6"></circle>
<rect fill="#CBD5E1" height="4" rx="2" width="34" x="32" y="78"></rect>
</g>

<text fill="#737785" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="bold" opacity="0.7" x="158" y="50">?</text>
<text fill="#737785" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="bold" opacity="0.5" x="178" y="36">?</text>

<g transform="translate(170, 48)">

<ellipse cx="28" cy="42" fill="#5A3825" rx="11" ry="13" transform="rotate(-12 28 42)"></ellipse>
<ellipse cx="28" cy="42" fill="#D9826C" rx="6" ry="8" transform="rotate(-12 28 42)"></ellipse>
<ellipse cx="84" cy="42" fill="#5A3825" rx="11" ry="13" transform="rotate(12 84 42)"></ellipse>
<ellipse cx="84" cy="42" fill="#D9826C" rx="6" ry="8" transform="rotate(12 84 42)"></ellipse>

<ellipse cx="56" cy="96" fill="#EA7A26" rx="42" ry="36"></ellipse>
<ellipse cx="56" cy="60" fill="#EA7A26" rx="36" ry="30"></ellipse>

<path d="M46 36 C52 34, 60 34, 66 36 C72 50, 74 72, 66 84 C62 90, 62 108, 56 108 C50 108, 50 90, 46 84 C38 72, 40 50, 46 36 Z" fill="#FFF5E9"></path>

<ellipse cx="44" cy="58" fill="#1A202C" rx="4.5" ry="5.5"></ellipse>
<circle cx="42" cy="55" fill="#FFFFFF" r="1.8"></circle>
<ellipse cx="72" cy="58" fill="#1A202C" rx="4.5" ry="5.5"></ellipse>
<circle cx="70" cy="55" fill="#FFFFFF" r="1.8"></circle>

<polygon fill="#5A3825" points="56,66 53,63 59,63"></polygon>
<path d="M52 71 Q56 69 61 71" fill="none" stroke="#5A3825" strokeLinecap="round" strokeWidth="2"></path>

<ellipse cx="68" cy="72" fill="#EA7A26" rx="9" ry="7" transform="rotate(-20 68 72)"></ellipse>

<path d="M42 26 L70 26 L66 34 L46 34 Z" fill="#14263D"></path>
<polygon fill="#1A2B42" points="56,8 88,22 56,34 24,22"></polygon>
<polygon fill="#223754" points="56,10 84,22 56,32 28,22"></polygon>
<circle cx="56" cy="22" fill="#F59E0B" r="2.5"></circle>
<path d="M56 22 Q78 24 80 36" fill="none" stroke="#F59E0B" strokeWidth="2"></path>
<polygon fill="#F59E0B" points="77,36 82,36 81,45 78,45"></polygon>
</g>
</svg>
</div>
<div className="p-6 flex-1 flex flex-col justify-start">
<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
<svg aria-hidden="true" focusable="false" className="w-6 h-6 text-[#536174]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">El problema</h3>
<p className="text-base text-[#536174] leading-relaxed">
                Es difícil comprobar habilidades técnicas solo con un currículum.
              </p>
</div>
</div>
<div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white border border-[#E2E8F0] shadow-md items-center justify-center text-[#536174]">
<svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col">
<div className="h-[180px] bg-teal-50 flex items-center justify-center relative overflow-hidden">
<svg aria-hidden="true" focusable="false" className="w-full h-full select-none" fill="none" viewBox="0 0 320 180">
<circle cx="160" cy="90" fill="#DEF3F5" r="72"></circle>

<g transform="translate(80, 45)">

<ellipse cx="32" cy="42" fill="#5A3825" rx="11" ry="13" transform="rotate(-15 32 42)"></ellipse>
<ellipse cx="32" cy="42" fill="#D9826C" rx="6" ry="8" transform="rotate(-15 32 42)"></ellipse>
<ellipse cx="88" cy="42" fill="#5A3825" rx="11" ry="13" transform="rotate(15 88 42)"></ellipse>
<ellipse cx="88" cy="42" fill="#D9826C" rx="6" ry="8" transform="rotate(15 88 42)"></ellipse>

<ellipse cx="60" cy="98" fill="#EA7A26" rx="44" ry="38"></ellipse>
<ellipse cx="60" cy="62" fill="#EA7A26" rx="38" ry="32"></ellipse>

<path d="M50 38 C56 36, 64 36, 70 38 C76 52, 78 72, 70 86 C66 94, 66 112, 60 112 C54 112, 54 94, 50 86 C42 72, 44 52, 50 38 Z" fill="#FFF5E9"></path>

<ellipse cx="48" cy="59" fill="#1A202C" rx="4.5" ry="5.5"></ellipse>
<circle cx="46" cy="56" fill="#FFFFFF" r="2"></circle>
<ellipse cx="76" cy="59" fill="#1A202C" rx="4.5" ry="5.5"></ellipse>
<circle cx="74" cy="56" fill="#FFFFFF" r="2"></circle>

<polygon fill="#5A3825" points="60,67 57,64 63,64"></polygon>
<path d="M56 69 Q60 74 64 69" fill="none" stroke="#5A3825" strokeLinecap="round" strokeWidth="2"></path>

<ellipse cx="92" cy="88" fill="#EA7A26" rx="10" ry="8"></ellipse>

<path d="M46 28 L74 28 L70 36 L50 36 Z" fill="#14263D"></path>
<polygon fill="#1A2B42" points="60,10 92,24 60,36 28,24"></polygon>
<polygon fill="#223754" points="60,12 88,24 60,34 32,24"></polygon>
<circle cx="60" cy="24" fill="#F59E0B" r="2.5"></circle>
<path d="M60 24 Q82 26 84 38" fill="none" stroke="#F59E0B" strokeWidth="2"></path>
<polygon fill="#F59E0B" points="81,38 86,38 85,47 82,47"></polygon>
</g>

<g transform="translate(180, 50)">
<rect fill="#FFFFFF" filter="drop-shadow(0 4px 14px rgba(8,127,140,0.15))" height="74" rx="10" stroke="#CBD5E1" strokeWidth="1.5" width="100"></rect>
<rect fill="#14263D" height="6" rx="3" width="48" x="14" y="16"></rect>
<rect fill="#CBD5E1" height="4" rx="2" width="68" x="14" y="28"></rect>
<rect fill="#CBD5E1" height="4" rx="2" width="36" x="14" y="38"></rect>

<rect fill="#E8F0FD" height="6" rx="3" width="68" x="14" y="50"></rect>
<rect fill="#087F8C" height="6" rx="3" width="52" x="14" y="50"></rect>

<circle cx="84" cy="20" fill="#167347" r="11"></circle>
<path d="M80 20l3 3 5-5" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></path>
</g>
</svg>
</div>
<div className="p-6 flex-1 flex flex-col justify-start">
<div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-4">
<svg aria-hidden="true" focusable="false" className="w-6 h-6 text-[#536174]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">La solución</h3>
<p className="text-base text-[#536174] leading-relaxed">
                Un desafío real, evaluado con criterios claros y con evidencia que cualquiera puede revisar.
              </p>
</div>
</div>
</div>
</div>
</section>
<section className="bg-[#F7F9FC] py-20 relative border-t border-[#E2E8F0]/60" id="como-funciona">
<div className="max-w-[1200px] mx-auto px-8 relative">
<h2 className="text-[32px] leading-tight font-bold text-[#14263D] text-center mb-14">
          Tu camino en 4 pasos
        </h2>
<div className="relative mb-14">
<div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] border-t-2 border-dashed border-[#087F8C]/40 z-0 pointer-events-none"></div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 flex flex-col shadow-lg">
<div className="flex items-center justify-between mb-4">
<div className="w-10 h-10 rounded-full bg-[#E8F0FD] text-[#165DCC] font-bold text-base flex items-center justify-center border border-[#165DCC]/15 shadow-sm">
                  1
                </div>
<div className="w-[72px] h-[52px] flex items-center justify-center bg-[#E8F0FD]/40 rounded-lg">
<svg aria-hidden="true" focusable="false" className="w-12 h-9" fill="none" viewBox="0 0 72 52">
<rect fill="#14263D" height="30" rx="3" width="52" x="10" y="8"></rect>
<rect fill="#E8F0FD" height="24" rx="2" width="46" x="13" y="11"></rect>
<path d="M25 21 L21 24 L25 27" stroke="#165DCC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
<path d="M33 21 L37 24 L33 27" stroke="#165DCC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
<path d="M30 19 L28 29" stroke="#087F8C" strokeLinecap="round" strokeWidth="1.5"></path>
<rect fill="#CBD5E1" height="4" rx="2" width="60" x="6" y="38"></rect>
</svg>
</div>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Resuelve un desafío</h3>
<p className="text-sm text-[#536174] leading-relaxed">
                Trabaja en un desafío técnico con requisitos y entregables claros.
              </p>
</div>
<div data-landing-hover="true" data-landing-state="paso-dos" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 flex flex-col shadow-lg">
<div className="flex items-center justify-between mb-4">
<div className="w-10 h-10 rounded-full bg-[#E8F0FD] text-[#165DCC] font-bold text-base flex items-center justify-center border border-[#165DCC]/15 shadow-sm">
                  2
                </div>
<div className="w-[72px] h-[52px] flex items-center justify-center bg-teal-50/50 rounded-lg">
<svg aria-hidden="true" focusable="false" className="w-12 h-9" fill="none" viewBox="0 0 72 52">
<path d="M12 16a3 3 0 013-3h12l4 4h26a3 3 0 013 3v20a3 3 0 01-3 3H15a3 3 0 01-3-3V16z" fill="#087F8C"></path>
<rect fill="#FFFFFF" height="21" rx="2" width="36" x="18" y="20"></rect>
<path d="M36 34V25M32 28l4-4 4 4" stroke="#165DCC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
</svg>
</div>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Envía tu evidencia</h3>
<p className="text-sm text-[#536174] leading-relaxed">
                Comparte tu repositorio público de GitHub y tu documentación.
              </p>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 flex flex-col shadow-lg">
<div className="flex items-center justify-between mb-4">
<div className="w-10 h-10 rounded-full bg-[#E8F0FD] text-[#165DCC] font-bold text-base flex items-center justify-center border border-[#165DCC]/15 shadow-sm">
                  3
                </div>
<div className="w-[72px] h-[52px] flex items-center justify-center bg-[#E8F0FD]/40 rounded-lg">
<svg aria-hidden="true" focusable="false" className="w-12 h-9" fill="none" viewBox="0 0 72 52">
<rect fill="#14263D" height="38" rx="3" width="32" x="20" y="8"></rect>
<rect fill="#FFFFFF" height="32" rx="2" width="26" x="23" y="11"></rect>
<rect fill="#CBD5E1" height="5" rx="1.5" width="14" x="29" y="6"></rect>
<path d="M27 18h12M27 24h18M27 30h10M27 36h14" stroke="#CBD5E1" strokeLinecap="round" strokeWidth="2"></path>
<circle cx="48" cy="34" fill="#E8F0FD" r="8"></circle>
<path d="M45 34l2 2 4-4" stroke="#165DCC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
</svg>
</div>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Recibe una evaluación</h3>
<p className="text-sm text-[#536174] leading-relaxed">
                Una persona evaluadora te califica con una rúbrica de 1 a 4.
              </p>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 flex flex-col shadow-lg">
<div className="flex items-center justify-between mb-4">
<div className="w-10 h-10 rounded-full bg-[#E8F0FD] text-[#165DCC] font-bold text-base flex items-center justify-center border border-[#165DCC]/15 shadow-sm">
                  4
                </div>
<div className="w-[72px] h-[52px] flex items-center justify-center bg-teal-50/50 rounded-lg">
<svg aria-hidden="true" focusable="false" className="w-12 h-9" fill="none" viewBox="0 0 72 52">
<circle cx="20" cy="22" fill="#165DCC" r="7"></circle>
<circle cx="52" cy="22" fill="#087F8C" r="7"></circle>
<path d="M26 34 C26 29, 32 29, 32 34" stroke="#165DCC" strokeLinecap="round" strokeWidth="3"></path>
<path d="M40 34 C40 29, 46 29, 46 34" stroke="#087F8C" strokeLinecap="round" strokeWidth="3"></path>
<path d="M27 22h18" stroke="#14263D" strokeDasharray="3 3" strokeWidth="2"></path>
<circle cx="36" cy="22" fill="#FFFFFF" r="3" stroke="#14263D" strokeWidth="2"></circle>
</svg>
</div>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Comparte tu pasaporte</h3>
<p className="text-sm text-[#536174] leading-relaxed">
                Obtén un enlace con tus competencias, feedback y evidencia.
              </p>
</div>
</div>
</div>
<div className="flex justify-center">
<Link data-landing-hover="true" className="h-12 px-8 bg-[#165DCC] text-white font-semibold text-base rounded-lg flex items-center justify-center shadow-lg" href="/login?mode=register">
            Crear cuenta
          </Link>
</div>
</div>
</section>
<section className="bg-white py-20 border-t border-[#E2E8F0]">
<div className="max-w-[1200px] mx-auto px-8">
<h2 className="text-[32px] leading-tight font-bold text-[#14263D] text-center mb-14">
          Pensado para cada persona del proceso
        </h2>
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
<div data-landing-hover="true" data-landing-state="estudiantes" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col">
<div className="h-[160px] bg-[#E8F0FD] flex items-center justify-center relative overflow-hidden">
<svg aria-hidden="true" focusable="false" className="w-full h-full select-none" fill="none" viewBox="0 0 280 160">
<circle cx="140" cy="80" fill="#DCE7FA" r="62"></circle>

<g transform="translate(95, 30)">

<ellipse cx="25" cy="35" fill="#5A3825" rx="9" ry="11" transform="rotate(-15 25 35)"></ellipse>
<ellipse cx="25" cy="35" fill="#D9826C" rx="5" ry="7" transform="rotate(-15 25 35)"></ellipse>
<ellipse cx="68" cy="35" fill="#5A3825" rx="9" ry="11" transform="rotate(15 68 35)"></ellipse>
<ellipse cx="68" cy="35" fill="#D9826C" rx="5" ry="7" transform="rotate(15 68 35)"></ellipse>

<ellipse cx="47" cy="82" fill="#EA7A26" rx="36" ry="30"></ellipse>
<ellipse cx="47" cy="52" fill="#EA7A26" rx="31" ry="26"></ellipse>

<path d="M38 32 C43 30, 50 30, 55 32 C60 44, 62 60, 55 72 C52 78, 52 92, 47 92 C42 92, 42 78, 38 72 C32 60, 34 44, 38 32 Z" fill="#FFF5E9"></path>

<ellipse cx="37" cy="50" fill="#1A202C" rx="3.8" ry="4.8"></ellipse>
<circle cx="35" cy="47" fill="#FFFFFF" r="1.6"></circle>
<ellipse cx="59" cy="50" fill="#1A202C" rx="3.8" ry="4.8"></ellipse>
<circle cx="57" cy="47" fill="#FFFFFF" r="1.6"></circle>

<polygon fill="#5A3825" points="47,56 44,53 50,53"></polygon>
<path d="M44 58 Q47 62 50 58" fill="none" stroke="#5A3825" strokeLinecap="round" strokeWidth="1.8"></path>

<path d="M35 24 L58 24 L55 31 L38 31 Z" fill="#14263D"></path>
<polygon fill="#1A2B42" points="47,9 73,20 47,31 21,20"></polygon>
<polygon fill="#223754" points="47,11 69,20 47,29 25,20"></polygon>
<circle cx="47" cy="20" fill="#F59E0B" r="2"></circle>
<path d="M47 20 Q64 22 66 32" fill="none" stroke="#F59E0B" strokeWidth="1.8"></path>
<polygon fill="#F59E0B" points="64,32 68,32 67,39 65,39"></polygon>

<rect fill="#14263D" height="24" rx="3" width="38" x="54" y="68"></rect>
<rect fill="#FFFFFF" height="18" rx="1.5" width="32" x="57" y="71"></rect>
<path d="M62 80 l3 3 5-5" stroke="#087F8C" strokeLinecap="round" strokeWidth="2"></path>
<ellipse cx="50" cy="80" fill="#EA7A26" rx="6" ry="5"></ellipse>
</g>
</svg>
</div>
<div className="p-6 flex-1 flex flex-col">
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Estudiantes</h3>
<p className="text-base text-[#536174] leading-relaxed">
                Demuestra tus habilidades con un resultado que puedes compartir.
              </p>
</div>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col">
<div className="h-[160px] bg-teal-50 flex items-center justify-center relative overflow-hidden">
<svg aria-hidden="true" focusable="false" className="w-full h-full select-none" fill="none" viewBox="0 0 280 160">
<circle cx="140" cy="80" fill="#DEF3F5" r="62"></circle>

<g transform="translate(78, 48)">
<rect fill="#FFFFFF" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" height="52" rx="4" stroke="#CBD5E1" strokeWidth="1.5" width="38"></rect>
<rect fill="#14263D" height="6" rx="1.5" width="16" x="11" y="-3"></rect>
<rect fill="#087F8C" height="4" rx="1.5" width="22" x="8" y="12"></rect>
<rect fill="#CBD5E1" height="3.5" rx="1" width="18" x="8" y="21"></rect>
<rect fill="#CBD5E1" height="3.5" rx="1" width="20" x="8" y="29"></rect>
<circle cx="12" cy="39" fill="#167347" r="3"></circle>
<rect fill="#CBD5E1" height="3.5" rx="1" width="14" x="18" y="37"></rect>
</g>

<g transform="translate(115, 30)">

<ellipse cx="28" cy="35" fill="#5A3825" rx="9" ry="11" transform="rotate(-15 28 35)"></ellipse>
<ellipse cx="28" cy="35" fill="#D9826C" rx="5" ry="7" transform="rotate(-15 28 35)"></ellipse>
<ellipse cx="71" cy="35" fill="#5A3825" rx="9" ry="11" transform="rotate(15 71 35)"></ellipse>
<ellipse cx="71" cy="35" fill="#D9826C" rx="5" ry="7" transform="rotate(15 71 35)"></ellipse>

<ellipse cx="50" cy="82" fill="#EA7A26" rx="36" ry="30"></ellipse>
<ellipse cx="50" cy="52" fill="#EA7A26" rx="31" ry="26"></ellipse>

<path d="M41 32 C46 30, 53 30, 58 32 C63 44, 65 60, 58 72 C55 78, 55 92, 50 92 C45 92, 45 78, 41 72 C35 60, 37 44, 41 32 Z" fill="#FFF5E9"></path>

<ellipse cx="40" cy="50" fill="#1A202C" rx="3.8" ry="4.8"></ellipse>
<circle cx="38" cy="47" fill="#FFFFFF" r="1.6"></circle>
<ellipse cx="62" cy="50" fill="#1A202C" rx="3.8" ry="4.8"></ellipse>
<circle cx="60" cy="47" fill="#FFFFFF" r="1.6"></circle>

<polygon fill="#5A3825" points="50,56 47,53 53,53"></polygon>
<path d="M47 58 Q50 61 53 58" fill="none" stroke="#5A3825" strokeLinecap="round" strokeWidth="1.8"></path>

<ellipse cx="18" cy="74" fill="#EA7A26" rx="7" ry="6"></ellipse>

<path d="M38 24 L61 24 L58 31 L41 31 Z" fill="#14263D"></path>
<polygon fill="#1A2B42" points="50,9 76,20 50,31 24,20"></polygon>
<polygon fill="#223754" points="50,11 72,20 50,29 28,20"></polygon>
<circle cx="50" cy="20" fill="#F59E0B" r="2"></circle>
<path d="M50 20 Q67 22 69 32" fill="none" stroke="#F59E0B" strokeWidth="1.8"></path>
<polygon fill="#F59E0B" points="67,32 71,32 70,39 68,39"></polygon>
</g>
</svg>
</div>
<div className="p-6 flex-1 flex flex-col">
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Evaluadores</h3>
<p className="text-base text-[#536174] leading-relaxed">
                Revisa evidencia con contexto y registra una evaluación trazable. El acceso es autorizado.
              </p>
</div>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col">
<div className="h-[160px] bg-[#E9EEF5] flex items-center justify-center relative overflow-hidden">
<svg aria-hidden="true" focusable="false" className="w-full h-full select-none" fill="none" viewBox="0 0 280 160">
<circle cx="140" cy="80" fill="#DFE7F0" r="62"></circle>

<g transform="translate(55, 48)">
<rect fill="#FFFFFF" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" height="58" rx="6" stroke="#CBD5E1" strokeWidth="1.5" width="86"></rect>
<rect fill="#E8F0FD" height="22" rx="11" width="22" x="8" y="10"></rect>
<circle cx="19" cy="21" fill="#165DCC" r="5"></circle>
<rect fill="#14263D" height="5" rx="2" width="38" x="36" y="12"></rect>
<rect fill="#087F8C" height="4" rx="2" width="26" x="36" y="22"></rect>

<rect fill="#F0F9FA" height="12" rx="6" width="68" x="8" y="38"></rect>
<circle cx="16" cy="44" fill="#167347" r="3"></circle>
<rect fill="#167347" height="3" rx="1.5" width="40" x="24" y="42.5"></rect>
</g>

<g transform="translate(142, 30)">

<ellipse cx="28" cy="35" fill="#5A3825" rx="9" ry="11" transform="rotate(-15 28 35)"></ellipse>
<ellipse cx="28" cy="35" fill="#D9826C" rx="5" ry="7" transform="rotate(-15 28 35)"></ellipse>
<ellipse cx="71" cy="35" fill="#5A3825" rx="9" ry="11" transform="rotate(15 71 35)"></ellipse>
<ellipse cx="71" cy="35" fill="#D9826C" rx="5" ry="7" transform="rotate(15 71 35)"></ellipse>

<ellipse cx="50" cy="82" fill="#EA7A26" rx="36" ry="30"></ellipse>
<ellipse cx="50" cy="52" fill="#EA7A26" rx="31" ry="26"></ellipse>

<path d="M41 32 C46 30, 53 30, 58 32 C63 44, 65 60, 58 72 C55 78, 55 92, 50 92 C45 92, 45 78, 41 72 C35 60, 37 44, 41 32 Z" fill="#FFF5E9"></path>

<ellipse cx="38" cy="50" fill="#1A202C" rx="3.8" ry="4.8"></ellipse>
<circle cx="36" cy="47" fill="#FFFFFF" r="1.6"></circle>
<ellipse cx="60" cy="50" fill="#1A202C" rx="3.8" ry="4.8"></ellipse>
<circle cx="58" cy="47" fill="#FFFFFF" r="1.6"></circle>

<polygon fill="#5A3825" points="48,56 45,53 51,53"></polygon>
<path d="M45 58 Q48 62 51 58" fill="none" stroke="#5A3825" strokeLinecap="round" strokeWidth="1.8"></path>

<ellipse cx="20" cy="76" fill="#EA7A26" rx="7" ry="6"></ellipse>

<path d="M38 24 L61 24 L58 31 L41 31 Z" fill="#14263D"></path>
<polygon fill="#1A2B42" points="50,9 76,20 50,31 24,20"></polygon>
<polygon fill="#223754" points="50,11 72,20 50,29 28,20"></polygon>
<circle cx="50" cy="20" fill="#F59E0B" r="2"></circle>
<path d="M50 20 Q67 22 69 32" fill="none" stroke="#F59E0B" strokeWidth="1.8"></path>
<polygon fill="#F59E0B" points="67,32 71,32 70,39 68,39"></polygon>
</g>
</svg>
</div>
<div className="p-6 flex-1 flex flex-col">
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Reclutadores</h3>
<p className="text-base text-[#536174] leading-relaxed">
                Entiende las competencias en segundos y comprueba la evidencia desde un enlace. No necesitas cuenta.
              </p>
</div>
</div>
</div>
</div>
</section>
<section className="bg-[#F7F9FC] py-20 border-t border-[#E2E8F0]" id="pasaporte">
<div className="max-w-[1200px] mx-auto px-8">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
<div className="lg:col-span-5 flex flex-col justify-center">
<h2 className="text-[32px] leading-tight font-bold text-[#14263D] mb-6">
              Qué encontrarás en un pasaporte
            </h2>
<ul className="space-y-4 mb-8">
<li className="flex items-start gap-3">
<svg aria-hidden="true" focusable="false" className="w-5 h-5 text-[#536174] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
<span className="text-base text-[#17212F]">Puntuación por competencia, con su rúbrica</span>
</li>
<li className="flex items-start gap-3">
<svg aria-hidden="true" focusable="false" className="w-5 h-5 text-[#536174] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
<span className="text-base text-[#17212F]">Feedback del evaluador</span>
</li>
<li className="flex items-start gap-3">
<svg aria-hidden="true" focusable="false" className="w-5 h-5 text-[#536174] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
<span className="text-base text-[#17212F]">Quién evaluó y cuándo</span>
</li>
<li className="flex items-start gap-3">
<svg aria-hidden="true" focusable="false" className="w-5 h-5 text-[#536174] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
<span className="text-base text-[#17212F]">Enlaces a la evidencia, si el estudiante los autoriza</span>
</li>
<li className="flex items-start gap-3">
<svg aria-hidden="true" focusable="false" className="w-5 h-5 text-[#536174] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
<span className="text-base text-[#17212F]">Un enlace fácil de compartir</span>
</li>
</ul>
<div>
<SectionLink className="h-12 px-6 border border-[#165DCC] text-[#165DCC] font-semibold text-base rounded-lg inline-flex items-center justify-center bg-white" href="#ejemplo-pasaporte">
                Ver ejemplo de pasaporte
              </SectionLink>
</div>
</div>
<div className="lg:col-span-7">
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 shadow-lg relative overflow-hidden">
<div className="flex items-center justify-between mb-6">
<h3 className="text-xl font-bold text-[#14263D]">Escala de evaluación</h3>
<span className="text-xs font-semibold px-2.5 py-1 bg-[#E8F0FD] text-[#165DCC] rounded-full">
                  Rúbrica progresiva
                </span>
</div>
<div className="space-y-3 relative mb-6">
<div className="flex items-center gap-4 p-3 rounded-lg border border-[#E2E8F0]/70 bg-[#F7F9FC]">
<div className="w-10 h-10 rounded-md bg-[#E9EEF5] text-[#14263D] font-bold text-base flex items-center justify-center flex-shrink-0 border border-[#E2E8F0]">
                    1
                  </div>
<div className="flex-1">
<h4 className="text-base font-semibold text-[#14263D]">1 · Insuficiente</h4>
<p className="text-sm text-[#536174]">No cumple con los requisitos base o presenta fallas estructurales.</p>
</div>
<div className="w-2.5 h-6 bg-[#E9EEF5] rounded-full hidden sm:block"></div>
</div>
<div className="flex items-center gap-4 p-3 rounded-lg border border-[#E2E8F0]/70 bg-teal-50">
<div className="w-10 h-10 rounded-md bg-[#D9F2F5] text-[#14263D] font-bold text-base flex items-center justify-center flex-shrink-0 border border-[#087F8C]/20">
                    2
                  </div>
<div className="flex-1">
<h4 className="text-base font-semibold text-[#14263D]">2 · Básico</h4>
<p className="text-sm text-[#536174]">Cumple con la funcionalidad mínima requerida sin optimizaciones.</p>
</div>
<div className="w-2.5 h-10 bg-[#79D4E2] rounded-full hidden sm:block"></div>
</div>
<div className="flex items-center gap-4 p-3 rounded-lg border border-[#E2E8F0]/70 bg-[#E8F0FD]">
<div className="w-10 h-10 rounded-md bg-[#D4E3FF] text-[#0046A3] font-bold text-base flex items-center justify-center flex-shrink-0 border border-[#165DCC]/30">
                    3
                  </div>
<div className="flex-1">
<h4 className="text-base font-semibold text-[#14263D]">3 · Competente</h4>
<p className="text-sm text-[#536174]">Diseño desacoplado, modular y con pruebas unitarias adecuadas.</p>
</div>
<div className="w-2.5 h-14 bg-[#B0C6FF] rounded-full hidden sm:block"></div>
</div>
<div className="relative flex items-center gap-4 p-3.5 rounded-lg border border-[#165DCC]/40 bg-gradient-to-r from-[#E8F0FD] to-white shadow-sm">
<div className="w-10 h-10 rounded-md bg-[#165DCC] text-white font-bold text-base flex items-center justify-center flex-shrink-0 shadow-sm">
                    4
                  </div>
<div className="flex-1">
<div className="flex items-center gap-2">
<h4 className="text-base font-bold text-[#14263D]">4 · Sobresaliente</h4>
<span className="text-[11px] font-semibold text-[#165DCC] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-[#165DCC]/20">Máximo</span>
</div>
<p className="text-sm text-[#536174]">Arquitectura sólida, rendimiento comprobado y manejo de casos extremos.</p>
</div>
<div className="w-12 h-14 flex-shrink-0 hidden sm:flex items-end justify-center">
<svg aria-hidden="true" focusable="false" className="w-10 h-12" fill="none" viewBox="0 0 48 56">

<g transform="translate(4, 4)">

<ellipse cx="10" cy="18" fill="#5A3825" rx="4.5" ry="5.5" transform="rotate(-15 10 18)"></ellipse>
<ellipse cx="30" cy="18" fill="#5A3825" rx="4.5" ry="5.5" transform="rotate(15 30 18)"></ellipse>

<ellipse cx="20" cy="36" fill="#EA7A26" rx="17" ry="13"></ellipse>
<ellipse cx="20" cy="23" fill="#EA7A26" rx="14" ry="11"></ellipse>

<ellipse cx="20" cy="27" fill="#FFF5E9" rx="7" ry="10"></ellipse>

<circle cx="15" cy="22" fill="#1A202C" r="2"></circle>
<circle cx="14" cy="21" fill="#FFFFFF" r="0.8"></circle>
<circle cx="25" cy="22" fill="#1A202C" r="2"></circle>
<circle cx="24" cy="21" fill="#FFFFFF" r="0.8"></circle>

<polygon fill="#5A3825" points="20,25 18,23.5 22,23.5"></polygon>
<path d="M18 26 Q20 28 22 26" fill="none" stroke="#5A3825" strokeWidth="1.2"></path>

<ellipse cx="33" cy="26" fill="#EA7A26" rx="4" ry="3.5" transform="rotate(-30 33 26)"></ellipse>

<polygon fill="#14263D" points="20,3 32,9 20,15 8,9"></polygon>
<circle cx="20" cy="9" fill="#F59E0B" r="1.2"></circle>
<path d="M20 9 Q28 10 29 16" fill="none" stroke="#F59E0B" strokeWidth="1.2"></path>
<circle cx="29" cy="16" fill="#F59E0B" r="1"></circle>
</g>
</svg>
</div>
<div className="w-2.5 h-16 bg-[#165DCC] rounded-full hidden sm:block"></div>
</div>
</div>
<div className="p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-start gap-3">
<svg aria-hidden="true" focusable="false" className="w-5 h-5 text-[#536174] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
<p className="text-sm text-[#14263D] leading-normal">
                  La inteligencia artificial solo ofrece una sugerencia de apoyo. No define la nota.
                </p>
</div>
</div>
</div>
</div>
</div>
</section>
<section className="bg-white py-20 border-t border-[#E2E8F0]">
<div className="max-w-[1200px] mx-auto px-8">
<h2 className="text-[32px] leading-tight font-bold text-[#14263D] text-center mb-14">
          Lo que nos importa
        </h2>
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 flex flex-col shadow-lg">
<div className="w-14 h-14 rounded-full bg-[#E8F0FD] flex items-center justify-center mb-5 border border-[#165DCC]/15">
<svg aria-hidden="true" focusable="false" className="w-7 h-7 text-[#165DCC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Evidencia real</h3>
<p className="text-base text-[#536174] leading-relaxed">
              Cada resultado se basa en trabajo que se puede revisar.
            </p>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 flex flex-col shadow-lg">
<div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mb-5 border border-[#087F8C]/15">
<svg aria-hidden="true" focusable="false" className="w-7 h-7 text-[#536174]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"></path>
<path d="M9 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Evaluación humana</h3>
<p className="text-base text-[#536174] leading-relaxed">
              Una persona toma la decisión. La IA es solo apoyo.
            </p>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 flex flex-col shadow-lg">
<div className="w-14 h-14 rounded-full bg-[#E9EEF5] flex items-center justify-center mb-5 border border-[#14263D]/10">
<svg aria-hidden="true" focusable="false" className="w-7 h-7 text-[#14263D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"></path>
<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</div>
<h3 className="text-xl font-semibold text-[#14263D] mb-2">Tú decides qué se ve</h3>
<p className="text-base text-[#536174] leading-relaxed">
              Tu repositorio y tu documentación son públicos solo si lo autorizas.
            </p>
</div>
</div>
</div>
</section>
<section className="bg-[#F7F9FC] py-20 border-t border-[#E2E8F0]" id="preguntas">
<div className="max-w-[1200px] mx-auto px-8">
<h2 className="text-[32px] leading-tight font-bold text-[#14263D] text-center mb-14">
          Resolvemos tus dudas
        </h2>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
<div className="lg:col-span-4 flex flex-col items-center justify-center bg-white border border-[#E2E8F0] rounded-[16px] p-8 shadow-lg text-center">
<svg aria-hidden="true" focusable="false" className="w-full max-w-[220px] h-auto select-none" fill="none" viewBox="0 0 240 220">

<path d="M130 35 C175 35, 205 60, 205 90 C205 110, 185 130, 160 135 L165 155 L140 140 C137 140, 133 140, 130 140 C85 140, 55 115, 55 85 C55 57, 88 35, 130 35 Z" fill="#E8F0FD"></path>
<path d="M125 70 C125 60, 138 58, 142 66 C145 72, 135 77, 134 85" fill="none" stroke="#165DCC" strokeLinecap="round" strokeWidth="4.5"></path>
<circle cx="134" cy="97" fill="#165DCC" r="3"></circle>

<g transform="translate(50, 100)">

<ellipse cx="32" cy="36" fill="#5A3825" rx="11" ry="13" transform="rotate(-15 32 36)"></ellipse>
<ellipse cx="32" cy="36" fill="#D9826C" rx="6" ry="8" transform="rotate(-15 32 36)"></ellipse>
<ellipse cx="88" cy="36" fill="#5A3825" rx="11" ry="13" transform="rotate(15 88 36)"></ellipse>
<ellipse cx="88" cy="36" fill="#D9826C" rx="6" ry="8" transform="rotate(15 88 36)"></ellipse>

<ellipse cx="60" cy="88" fill="#EA7A26" rx="46" ry="36"></ellipse>
<ellipse cx="60" cy="56" fill="#EA7A26" rx="38" ry="32"></ellipse>

<path d="M50 32 C56 30, 64 30, 70 32 C76 46, 78 68, 70 82 C66 90, 66 106, 60 106 C54 106, 54 90, 50 82 C42 68, 44 46, 50 32 Z" fill="#FFF5E9"></path>

<ellipse cx="48" cy="52" fill="#1A202C" rx="5" ry="6"></ellipse>
<circle cx="49" cy="49" fill="#FFFFFF" r="2.2"></circle>
<ellipse cx="76" cy="52" fill="#1A202C" rx="5" ry="6"></ellipse>
<circle cx="77" cy="49" fill="#FFFFFF" r="2.2"></circle>

<polygon fill="#5A3825" points="60,61 57,58 63,58"></polygon>
<path d="M56 64 Q60 68 64 64" fill="none" stroke="#5A3825" strokeLinecap="round" strokeWidth="2"></path>

<ellipse cx="44" cy="94" fill="#EA7A26" rx="10" ry="8"></ellipse>
<ellipse cx="76" cy="94" fill="#EA7A26" rx="10" ry="8"></ellipse>

<path d="M46 22 L74 22 L70 30 L50 30 Z" fill="#14263D"></path>
<polygon fill="#1A2B42" points="60,4 92,18 60,30 28,18"></polygon>
<polygon fill="#223754" points="60,6 88,18 60,28 32,18"></polygon>
<circle cx="60" cy="18" fill="#F59E0B" r="2.5"></circle>
<path d="M60 18 Q82 20 84 32" fill="none" stroke="#F59E0B" strokeWidth="2"></path>
<polygon fill="#F59E0B" points="81,32 86,32 85,41 82,41"></polygon>
</g>
</svg>
<h3 className="text-lg font-bold text-[#14263D] mt-4 mb-1">¿Tienes preguntas adicionales?</h3>
<p className="text-sm text-[#536174]">Consulta nuestras respuestas clave o contáctanos a soporte.</p>
</div>
<div className="lg:col-span-8 space-y-3">
<details data-landing-state="primera-pregunta" className="group bg-white border border-[#E2E8F0] rounded-[12px] shadow-sm overflow-hidden" open>
<summary className="flex justify-between items-center p-5 cursor-pointer list-none select-none">
<span className="text-base font-semibold text-[#14263D]">¿Quién evalúa mi solución?</span>
<span className="w-8 h-8 rounded-full bg-[#E8F0FD]/60 text-[#165DCC] flex items-center justify-center flex-shrink-0 group-open:rotate-180">
<svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</span>
</summary>
<div className="px-5 pb-5 pt-1 text-base text-[#536174] leading-relaxed border-t border-gray-100">
                Un profesional revisará tu evidencia y evaluará tu solución con una rúbrica de 1 a 4.
              </div>
</details>
<details className="group bg-white border border-[#E2E8F0] rounded-[12px] shadow-sm overflow-hidden">
<summary className="flex justify-between items-center p-5 cursor-pointer list-none select-none">
<span className="text-base font-semibold text-[#14263D]">¿La IA califica mi trabajo?</span>
<span className="w-8 h-8 rounded-full bg-[#E8F0FD]/60 text-[#165DCC] flex items-center justify-center flex-shrink-0 group-open:rotate-180">
<svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</span>
</summary>
<div className="px-5 pb-5 pt-1 text-base text-[#536174] leading-relaxed border-t border-gray-100">
                No. La IA solo ofrece una sugerencia de apoyo. La decisión y la nota son del evaluador.
              </div>
</details>
<details className="group bg-white border border-[#E2E8F0] rounded-[12px] shadow-sm overflow-hidden">
<summary className="flex justify-between items-center p-5 cursor-pointer list-none select-none">
<span className="text-base font-semibold text-[#14263D]">¿Mi repositorio debe ser público?</span>
<span className="w-8 h-8 rounded-full bg-[#E8F0FD]/60 text-[#165DCC] flex items-center justify-center flex-shrink-0 group-open:rotate-180">
<svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</span>
</summary>
<div className="px-5 pb-5 pt-1 text-base text-[#536174] leading-relaxed border-t border-gray-100">
                Sí. Debes ingresar la URL completa de un repositorio público de GitHub.
              </div>
</details>
<details className="group bg-white border border-[#E2E8F0] rounded-[12px] shadow-sm overflow-hidden">
<summary className="flex justify-between items-center p-5 cursor-pointer list-none select-none">
<span className="text-base font-semibold text-[#14263D]">¿Puedo editar mi entrega después de enviarla?</span>
<span className="w-8 h-8 rounded-full bg-[#E8F0FD]/60 text-[#165DCC] flex items-center justify-center flex-shrink-0 group-open:rotate-180">
<svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</span>
</summary>
<div className="px-5 pb-5 pt-1 text-base text-[#536174] leading-relaxed border-t border-gray-100">
                No. Al enviar, ya no podrás editar esa versión. Antes de enviar puedes guardar borradores.
              </div>
</details>
<details className="group bg-white border border-[#E2E8F0] rounded-[12px] shadow-sm overflow-hidden">
<summary className="flex justify-between items-center p-5 cursor-pointer list-none select-none">
<span className="text-base font-semibold text-[#14263D]">¿Quién puede ver mi pasaporte?</span>
<span className="w-8 h-8 rounded-full bg-[#E8F0FD]/60 text-[#165DCC] flex items-center justify-center flex-shrink-0 group-open:rotate-180">
<svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</span>
</summary>
<div className="px-5 pb-5 pt-1 text-base text-[#536174] leading-relaxed border-t border-gray-100">
                Cualquier persona que tenga tu enlace. Tu repositorio y tu documentación solo se muestran si autorizas que la evidencia sea pública.
              </div>
</details>
</div>
</div>
</div>
</section>
<section className="py-12 px-6 sm:px-8 bg-[#F7F9FC]">
<div className="max-w-[1200px] mx-auto bg-[#14263D] rounded-[32px] text-white p-10 md:p-16 relative overflow-hidden shadow-xl">
<div className="absolute -right-16 -top-16 w-80 h-80 bg-[#165DCC]/20 rounded-full filter blur-3xl pointer-events-none"></div>
<div className="absolute -left-16 -bottom-16 w-80 h-80 bg-[#087F8C]/20 rounded-full filter blur-3xl pointer-events-none"></div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
<div className="lg:col-span-7 flex flex-col items-start text-left">
<h2 className="text-3xl md:text-4xl font-bold mb-6 text-white leading-tight">
              Crea tu cuenta y comienza tu desafío.
            </h2>
<p className="text-base text-gray-300 mb-8 max-w-lg leading-relaxed">
              Obtén reconocimiento formal para tu portafolio técnico mediante proyectos evaluados con criterio profesional.
            </p>
<div className="flex flex-wrap items-center gap-4">
<Link className="h-12 px-8 bg-white text-[#14263D] font-bold text-base rounded-lg inline-flex items-center justify-center shadow-md" href="/login?mode=register">
                Crear cuenta
              </Link>
<Link className="text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white rounded py-2 px-3" href="/login">
                ¿Ya tienes cuenta? Iniciar sesión
              </Link>
</div>
</div>
<div className="lg:col-span-5 flex justify-center lg:justify-end">
<svg aria-hidden="true" focusable="false" className="w-full max-w-[280px] h-auto select-none" fill="none" viewBox="0 0 320 220">

<circle cx="160" cy="110" fill="#1E385B" r="90"></circle>
<circle cx="230" cy="60" fill="#087F8C" opacity="0.6" r="16"></circle>

<path d="M80 60 L83 68 L91 71 L83 74 L80 82 L77 74 L69 71 L77 68 Z" fill="#FFFFFF"></path>
<path d="M245 130 L247 135 L252 137 L247 139 L245 144 L243 139 L238 137 L243 135 Z" fill="#79D4E2"></path>

<g transform="translate(100, 30)">

<ellipse cx="36" cy="46" fill="#5A3825" rx="13" ry="15" transform="rotate(-15 36 46)"></ellipse>
<ellipse cx="36" cy="46" fill="#D9826C" rx="7" ry="9" transform="rotate(-15 36 46)"></ellipse>
<ellipse cx="96" cy="46" fill="#5A3825" rx="13" ry="15" transform="rotate(15 96 46)"></ellipse>
<ellipse cx="96" cy="46" fill="#D9826C" rx="7" ry="9" transform="rotate(15 96 46)"></ellipse>

<ellipse cx="66" cy="116" fill="#EA7A26" rx="54" ry="46"></ellipse>
<ellipse cx="66" cy="72" fill="#EA7A26" rx="44" ry="38"></ellipse>

<path d="M54 44 C60 42, 72 42, 78 44 C86 60, 88 88, 78 104 C74 112, 74 136, 66 136 C58 136, 58 112, 54 104 C44 88, 46 60, 54 44 Z" fill="#FFF5E9"></path>

<ellipse cx="52" cy="68" fill="#1A202C" rx="5.5" ry="6.5"></ellipse>
<circle cx="50" cy="65" fill="#FFFFFF" r="2.4"></circle>
<ellipse cx="82" cy="68" fill="#1A202C" rx="5.5" ry="6.5"></ellipse>
<circle cx="80" cy="65" fill="#FFFFFF" r="2.4"></circle>

<polygon fill="#5A3825" points="66,77 62,74 70,74"></polygon>
<path d="M61 80 Q66 86 71 80" fill="none" stroke="#5A3825" strokeLinecap="round" strokeWidth="2.4"></path>

<ellipse cx="18" cy="78" fill="#EA7A26" rx="12" ry="9" transform="rotate(-35 18 78)"></ellipse>

<g transform="translate(96, 75)">
<ellipse cx="10" cy="16" fill="#EA7A26" rx="11" ry="9"></ellipse>

<rect fill="#FFFFFF" height="36" rx="4" stroke="#E2E8F0" strokeWidth="1.5" transform="rotate(35 10 10)" width="16" x="6" y="-8"></rect>

<rect fill="#B42318" height="8" rx="2" transform="rotate(35 10 10)" width="18" x="5" y="6"></rect>
</g>

<ellipse cx="48" cy="148" fill="#5A3825" rx="12" ry="8"></ellipse>
<ellipse cx="84" cy="148" fill="#5A3825" rx="12" ry="8"></ellipse>

<path d="M50 30 L82 30 L78 40 L54 40 Z" fill="#14263D"></path>
<polygon fill="#1A2B42" points="66,10 102,26 66,40 30,26"></polygon>
<polygon fill="#223754" points="66,12 98,26 66,38 34,26"></polygon>
<circle cx="66" cy="26" fill="#F59E0B" r="3"></circle>
<path d="M66 26 Q90 28 92 42" fill="none" stroke="#F59E0B" strokeWidth="2.5"></path>
<polygon fill="#F59E0B" points="89,42 95,42 94,52 90,52"></polygon>
</g>
</svg>
</div>
</div>
</div>
</section>
<section className="bg-white py-20 border-t border-[#E2E8F0]" id="equipo">
<div className="max-w-[1200px] mx-auto px-8">
<div className="text-center mb-14">
<h2 className="text-[32px] leading-tight font-bold text-[#14263D] mb-3">
            Las personas detrás de SKILLPROOF
          </h2>
<p className="text-base text-[#536174] max-w-2xl mx-auto">
            Proyecto desarrollado en el Hackatón por Assemblerss, un equipo que combina backend, diseño y producto.
          </p>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col items-center text-center pb-6">
<div className="w-full h-14 bg-[#E8F0FD]"></div>
<div className="-mt-10 w-20 h-20 rounded-full bg-white border-[3px] border-[#E8F0FD] text-[#165DCC] font-bold text-2xl flex items-center justify-center mb-4 shadow-sm">
              JC
            </div>
<div className="px-5 w-full flex flex-col items-center">
<h3 className="text-xl font-bold text-[#14263D] mb-4">Jhoe Noa Castro</h3>
<div className="flex flex-wrap justify-center gap-2">
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Backend</span>
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Ideación y estructura del proyecto</span>
</div>
</div>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col items-center text-center pb-6">
<div className="w-full h-14 bg-teal-50"></div>
<div className="-mt-10 w-20 h-20 rounded-full bg-white border-[3px] border-[#E8F0FD] text-[#165DCC] font-bold text-2xl flex items-center justify-center mb-4 shadow-sm">
              NC
            </div>
<div className="px-5 w-full flex flex-col items-center">
<h3 className="text-xl font-bold text-[#14263D] mb-4">Nicole Chang</h3>
<div className="flex flex-wrap justify-center gap-2">
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Pitch</span>
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Ideación</span>
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Estructura del proyecto</span>
</div>
</div>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col items-center text-center pb-6">
<div className="w-full h-14 bg-[#E9EEF5]"></div>
<div className="-mt-10 w-20 h-20 rounded-full bg-white border-[3px] border-[#E8F0FD] text-[#165DCC] font-bold text-2xl flex items-center justify-center mb-4 shadow-sm">
              FL
            </div>
<div className="px-5 w-full flex flex-col items-center">
<h3 className="text-xl font-bold text-[#14263D] mb-4">Fatima Lozano</h3>
<div className="flex flex-wrap justify-center gap-2">
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Implementación</span>
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">UX/UI</span>
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Documentación</span>
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Ideación</span>
</div>
</div>
</div>
<div data-landing-hover="true" className="bg-white border border-[#E2E8F0] rounded-[12px] overflow-hidden shadow-lg flex flex-col items-center text-center pb-6">
<div className="w-full h-14 bg-[#E8F0FD]"></div>
<div className="-mt-10 w-20 h-20 rounded-full bg-white border-[3px] border-[#E8F0FD] text-[#165DCC] font-bold text-2xl flex items-center justify-center mb-4 shadow-sm">
              PL
            </div>
<div className="px-5 w-full flex flex-col items-center">
<h3 className="text-xl font-bold text-[#14263D] mb-4">Patrick Limaylla</h3>
<div className="flex flex-wrap justify-center gap-2">
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">UX/UI</span>
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Implementación</span>
<span className="bg-[#E9EEF5] text-[#14263D] text-xs px-3 py-1.5 rounded-full font-medium">Elaboración de interfaces</span>
</div>
</div>
</div>
</div>
</div>
</section>
</main>
<footer className="bg-white border-t border-[#E2E8F0] py-8">
<div className="max-w-[1200px] mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
<div className="flex items-center gap-3">
<span className="font-bold text-[#14263D] tracking-tight">SKILLPROOF</span>
<span className="text-sm text-[#536174]">·</span>
<span className="text-sm text-[#536174]">© SKILLPROOF · Proyecto del Hackatón</span>
</div>
<div className="flex items-center gap-6">
<button className="text-sm text-[#536174]" type="button" disabled title="Términos aún no disponible">Términos</button>
<button className="text-sm text-[#536174]" type="button" disabled title="Soporte aún no disponible">Soporte</button>
</div>
</div>
</footer>

  </div>;
}
