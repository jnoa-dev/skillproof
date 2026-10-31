import { Suspense } from "react";
import PanelEvaluador, { CargaPaginaEvaluador } from "@/components/evaluator/panel-page";

export default function EvaluatorPage() {
  return <Suspense fallback={<CargaPaginaEvaluador/>}><PanelEvaluador/></Suspense>;
}
