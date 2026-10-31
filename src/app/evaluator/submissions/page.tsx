import type { Metadata } from "next";
import { Suspense } from "react";
import PanelEvaluador, { CargaPaginaEvaluador } from "@/components/evaluator/panel-page";

export const metadata: Metadata = { title: "Entregas por evaluar · SKILLPROOF" };

export default function EntregasEvaluadorPage() {
  return <Suspense fallback={<CargaPaginaEvaluador vista="entregas"/>}><PanelEvaluador vista="entregas"/></Suspense>;
}
