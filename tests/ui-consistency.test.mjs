import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const local = { exports: {} }; new Function("require", "module", "exports", code)(name => name in dependencies ? dependencies[name] : require(name), local, local.exports); return local.exports;
}
const loading = load("src/components/ui/loading-state.tsx");
const link = ({ children, ...props }) => React.createElement("a", props, children);
test("Las cargas de página y panel anuncian su estado y ocultan el esqueleto decorativo", () => {
  for (const props of [{ fullPage: true }, {}, { compact: true }]) {
    const html = renderToStaticMarkup(React.createElement(loading.LoadingState, { ...props, label: "Cargando entrevistas…" }));
    assert.match(html, /aria-busy="true"/); assert.match(html, /role="status"/); assert.match(html, /aria-hidden="true"/); assert.match(html, /carga-animada/); assert.match(html, /Cargando entrevistas…/); assert.doesNotMatch(html, /<button|<a /);
  }
});
test("El menú del equipo no incluye entrega, desafío propio, pasaporte ni vista estudiante", async () => {
  for (const role of ["admin", "evaluator"]) {
    const db = { auth: { getUser: async () => ({ data: { user: { id: "staff" } } }) }, from() { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { role, display_name: "Equipo" } }) }; } };
    const shell = load("src/components/evaluator/workspace-shell.tsx", { "@/lib/supabase/server": { createClient: async () => db }, "next/server": { connection: async () => {} }, "next/font/google": { Inter: () => ({ className: "inter" }) }, "next/navigation": { redirect: () => { throw new Error("Unexpected redirect"); } }, "next/link": { default: link, __esModule: true }, "./states": { AccesoEvaluador: () => null } });
    const html = renderToStaticMarkup(await shell.default({ section: "interviews", children: "Contenido del equipo" }));
    assert.match(html, /href="\/evaluator\/interviews"/); assert.match(html, /href="\/evaluator\/candidates"/); assert.doesNotMatch(html, /Vista estudiante|Mi entrega|Mi desafío|href="\/interviews"|href="\/challenges\/|href="\/passport/);
    assert.equal(html.includes('href="/evaluator/challenges"'), role === "admin");
  }
});
test("Mi cuenta solo ofrece privacidad del pasaporte a estudiantes", () => {
  const profile = load("src/components/account/profile.tsx", { "@/components/ui/loading-state": loading, "next/link": { default: link, __esModule: true }, "next/navigation": { useRouter: () => ({}) }, "@/app/account/actions": { guardarNombre: async () => ({}) }, "@/lib/supabase/client": { createClient: () => ({}) } });
  for (const role of ["Estudiante", "Evaluador", "Administrador", "Reclutador"]) {
    const html = renderToStaticMarkup(React.createElement(profile.default, { nombreInicial: "Cuenta", correo: "cuenta@example.test", confirmado: true, rol: role }));
    assert.match(html, />Perfil<|>Perfil /); assert.match(html, />Seguridad</); assert.equal(html.includes("Privacidad y pasaporte"), role === "Estudiante");
  }
});
