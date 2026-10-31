type Props = { label?: string; fullPage?: boolean; compact?: boolean };

/** Un único esqueleto animado para las rutas y las consultas de cada apartado. */
export function LoadingState({ label = "Cargando información…", fullPage = false, compact = false }: Props) {
  const content = <section aria-busy="true" aria-label={label} className="w-full rounded-xl border border-slate-200 bg-white p-6 text-[#536174] shadow-sm">
    <p role="status" className="mb-5 text-sm">{label}</p>
    <div aria-hidden="true" className="carga-animada space-y-5">
      <div className="h-5 w-2/5 rounded bg-slate-200"/>
      <div className="h-3 w-3/4 rounded bg-slate-100"/>
      {!compact && <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4 rounded-xl border border-slate-100 p-5"><div className="h-5 w-2/3 rounded bg-slate-200"/><div className="h-3 w-full rounded bg-slate-100"/><div className="h-3 w-4/5 rounded bg-slate-100"/><div className="h-20 rounded-lg bg-slate-100"/><div className="h-10 w-36 rounded-lg bg-slate-200"/></div>
        <div className="space-y-6 rounded-xl border border-slate-100 p-5">{[0, 1, 2, 3].map(index => <div key={index} className="flex items-center gap-3"><div className="size-5 shrink-0 rounded-full bg-slate-200"/><div className="w-full space-y-2"><div className="h-3 w-3/4 rounded bg-slate-200"/><div className="h-2 w-1/2 rounded bg-slate-100"/></div></div>)}</div>
      </div>}
      {compact && <div className="h-20 rounded-lg bg-slate-100"/>}
    </div>
  </section>;
  return fullPage ? <main className="min-h-screen bg-[#f8f9ff] px-6 py-10"><div className="mx-auto max-w-[1200px] space-y-7"><div aria-hidden="true" className="carga-animada flex h-12 items-center justify-between"><div className="h-5 w-32 rounded bg-slate-200"/><div className="size-9 rounded-full bg-slate-200"/></div>{content}</div></main> : content;
}
