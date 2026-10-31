"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CopiarEnlace() {
  const [mensaje, setMensaje] = useState("");
  const [alternativa, setAlternativa] = useState("");
  const enCurso = useRef(false);
  useEffect(() => {
    if (mensaje !== "Enlace copiado.") return;
    const temporizador = window.setTimeout(() => setMensaje(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [mensaje]);
  return <div><button type="button" className="min-h-10 rounded-md border border-blue-700 bg-blue-700 px-4 text-sm font-medium text-white transition-[scale,box-shadow] hover:shadow-md motion-safe:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    const url = new URL(window.location.pathname, window.location.origin).href;
    try { await navigator.clipboard.writeText(url); setMensaje("Enlace copiado."); setAlternativa(""); }
    catch { setAlternativa(url); setMensaje("Copia el enlace del campo siguiente."); }
    finally { enCurso.current = false; }
  }}>Copiar enlace</button><span role="status" aria-live="polite" className={mensaje === "Enlace copiado." ? "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-teal-200 bg-white px-4 py-3 text-sm text-teal-800 shadow-lg" : "mt-1 block text-xs text-slate-500"}>{mensaje === "Enlace copiado." && <span aria-hidden="true">✓</span>}{mensaje}</span>{alternativa && <input aria-label="Enlace público para copiar" readOnly value={alternativa} onFocus={event => event.target.select()} className="mt-2 w-full rounded border border-slate-300 p-2 text-xs"/>}</div>;
}

export function AbrirPasaporte() {
  const [valor, setValor] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  return <form onSubmit={event => {
    event.preventDefault();
    let slug = valor.trim();
    if (slug.includes("/")) {
      try {
        const url = new URL(slug, window.location.origin);
        if (url.origin !== window.location.origin) throw new Error();
        const coincidencia = /^\/passport\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(url.pathname);
        if (!coincidencia) throw new Error();
        slug = coincidencia[1];
      } catch { setError("Introduce un enlace de pasaporte de este sitio o su código público."); return; }
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) { setError("Introduce un código público válido."); return; }
    setError(""); router.push(`/passport/${slug}`);
  }} className="space-y-4"><label className="block text-sm font-medium">Enlace o código público<input required maxLength={2048} value={valor} onChange={event => setValor(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "error-pasaporte" : undefined} className="mt-2 w-full rounded-lg border border-slate-300 p-3 shadow-sm focus:outline-2 focus:outline-blue-700"/></label>{error && <p id="error-pasaporte" role="alert" className="text-sm text-red-700">{error}</p>}<button type="submit" className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Abrir pasaporte</button></form>;
}
