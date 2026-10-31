import Link from "next/link";
import type { DefenseData } from "@/lib/defense/types";
import { Badge, card, primary, secondary } from "./defense-shell";

export function Evidence({ data }: { data: DefenseData }) {
  const url = data.submission?.github_repo_url;
  const safe = url && /^https:\/\/(www\.)?github\.com\/[^\s]+$/i.test(url);
  return <section className={card}><h2 className="text-lg font-semibold text-[#14263d]">Tu entrega de código</h2><p className="mt-3 text-sm text-[#536174]">{data.submission ? data.submission.status === "submitted" ? "Enviada" : "Borrador" : "Sin entrega registrada"}</p>
    {safe && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 block break-all text-sm text-[#165dcc] underline">Ver repositorio ↗</a>}
    <p className="mt-4 text-xs leading-relaxed text-[#536174]">Esta referencia no confirma un commit ni una auditoría del repositorio.</p></section>;
}
export default function DefenseStatus({ data }: { data: DefenseData }) {
  const ready = data.submission?.status === "submitted";
  const base = "/challenges/" + encodeURIComponent(data.slug);
  return <div className="grid items-start gap-6 lg:grid-cols-12"><div className="space-y-6 lg:col-span-8">
    <section className={card}><h2 className="text-lg font-semibold">Tu progreso</h2><ol className="mt-5 grid gap-3 sm:grid-cols-3">
      {[["Parte 1 · Código", ready ? "Enviado" : data.submission ? "Borrador" : "Sin entrega"], ["Parte 2 · Defensa", "Sin servicio conectado"], ["Resultado", "No disponible"]].map(([label, status], i) => <li key={label} className="rounded-lg bg-[#eff3ff] p-4"><span className="text-xs font-semibold text-[#165dcc]">0{i + 1}</span><h3 className="mt-2 text-sm font-semibold">{label}</h3><p className="mt-2 text-xs text-[#536174]">{status}</p></li>)}
    </ol></section>
    <section className={card + " space-y-5 border-l-4 border-l-[#165dcc]"}><Badge>Siguiente paso</Badge><h2 className="text-2xl font-bold text-[#14263d]">Defiende tu solución</h2><p className="text-sm leading-relaxed text-[#536174]">Explora cómo responder preguntas sobre los requisitos de tu desafío. La duración y las preguntas definitivas aún no están publicadas.</p>
      <div className="grid gap-3 sm:grid-cols-3">{["Tiempo configurable", data.questions.length + " requisitos publicados", "Redacción propia"].map(text => <div key={text} className="rounded-lg bg-[#eff3ff] p-4 text-sm font-semibold">{text}</div>)}</div>
      {ready ? <Link href={base + "/defense/instructions"} className={primary}>Ver indicaciones →</Link> : <p className="text-sm text-[#985b00]">Necesitas una entrega de código enviada para acceder a la previsualización del cuestionario.</p>}
      <Link href={base + "/defense/receipt"} className={secondary}>Estado y constancia</Link><Link href={base + "/submission"} className={secondary}>Ver mi entrega</Link>
    </section></div><aside className="space-y-6 lg:col-span-4"><Evidence data={data} /><section className={card}><h2 className="font-semibold">¿Cómo se evalúa?</h2><p className="mt-3 text-sm leading-relaxed text-[#536174]">La revisión de defensa y su integración con IA necesitan un servicio específico. Aquí no se muestra una nota ni un resultado de IA.</p></section></aside></div>;
}
