"use client";

import type { ComponentPropsWithoutRef } from "react";

const efectosActivos = new WeakMap<HTMLElement, () => void>();

function desenfocarDuranteDeslizamiento(landing: HTMLElement) {
  let pausa: number | undefined;
  const limite = window.setTimeout(terminar, 2500);

  function terminar() {
    window.clearTimeout(pausa);
    window.clearTimeout(limite);
    window.removeEventListener("scroll", alDeslizar);
    window.removeEventListener("scrollend", terminar);
    landing.removeAttribute("data-deslizando");
    efectosActivos.delete(landing);
  }

  function alDeslizar() {
    window.clearTimeout(pausa);
    pausa = window.setTimeout(terminar, 160);
  }

  landing.setAttribute("data-deslizando", "true");
  window.addEventListener("scroll", alDeslizar, { passive: true });
  window.addEventListener("scrollend", terminar);
  efectosActivos.set(landing, terminar);
}

/** Conserva el enlace nativo como alternativa antes de la hidratación. */
export default function SectionLink({ onClick, ...props }: ComponentPropsWithoutRef<"a">) {
  return <a {...props} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank" || !props.href?.startsWith("#")) return;
    const destino = document.getElementById(props.href.slice(1));
    if (!destino) return;
    event.preventDefault();
    const margen = Number.parseFloat(window.getComputedStyle(destino).scrollMarginTop) || 96;
    const posicion = Math.max(0, destino.getBoundingClientRect().top + window.scrollY - margen);
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const landing = destino.closest<HTMLElement>(".landing");
    if (landing) {
      efectosActivos.get(landing)?.();
      if (!reducirMovimiento && Math.abs(posicion - window.scrollY) > 2) desenfocarDuranteDeslizamiento(landing);
    }
    window.scrollTo({ top: posicion, behavior: reducirMovimiento ? "instant" : "smooth" });
    if (window.location.hash !== props.href) window.history.pushState(null, "", props.href);
  }}/>;
}
