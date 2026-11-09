import Link from "next/link";
import type { DefenseData } from "@/lib/defense/types";
import { card, secondary } from "./defense-shell";
import { Evidence } from "./defense-status";
export default function DefenseReceipt({ data }: { data: DefenseData }) {
  return <div className="grid items-start gap-6 lg:grid-cols-12"><section className={card + " space-y-5 lg:col-span-8"}><h2 className="text-2xl font-bold">No hay constancia de defensa disponible</h2><p className="text-sm leading-relaxed text-[#536174]">El servicio de recepción de defensas todavía no está conectado. No podemos consultar ni confirmar un envío. Esto no indica que una defensa real haya sido recibida o rechazada.</p><dl className="grid gap-4 sm:grid-cols-2">{["Identificador de defensa", "Fecha de recepción", "Respuestas recibidas", "Resultado de IA"].map(label => <div key={label} className="rounded-lg bg-[#eff3ff] p-4"><dt className="text-xs text-[#536174]">{label}</dt><dd className="mt-2 text-sm font-semibold">No disponible</dd></div>)}</dl><button disabled className={secondary}>Descargar constancia · No disponible</button><Link href={"/challenges/" + encodeURIComponent(data.slug) + "/defense"} className={secondary}>← Volver al estado</Link></section><aside className="lg:col-span-4"><Evidence data={data} /></aside></div>;
}
