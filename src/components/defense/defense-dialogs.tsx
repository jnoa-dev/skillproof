"use client";

import { useEffect, useRef } from "react";
import { secondary } from "./defense-shell";

export default function DefenseDialog({ title, children, close }: {
  title: string; children: React.ReactNode; close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} onCancel={close} aria-labelledby="defense-dialog-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-[760px] overflow-auto rounded-2xl border border-[#cbd5e1] bg-white p-5 text-[#14263d] shadow-xl sm:p-10">
    <div className="flex items-start gap-4"><span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-[#eff3ff] text-2xl text-[#165dcc]">?</span><h2 id="defense-dialog-title" className="pt-1 text-2xl font-bold sm:text-[28px]">{title}</h2></div>
    <div className="my-6 space-y-6 text-sm leading-relaxed sm:text-base">{children}</div>
    <button autoFocus onClick={close} className={secondary}>Volver a la práctica</button>
  </dialog>;
}
