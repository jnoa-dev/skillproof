import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const local = { exports: {} }; new Function("require", "module", "exports", code)(name => name in dependencies ? dependencies[name] : name === "@/components/ui/loading-state" ? load("src/components/ui/loading-state.tsx") : require(name), local, local.exports); return local.exports;
}
const roles = load("src/lib/auth/dashboard.ts");
const server = load("src/lib/defense/server.ts");
function studentGuard(role, error = null) {
  const db = { from() { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: role ? { role } : null, error }) }; } };
  const guard = load("src/lib/auth/student.ts", { "./dashboard": roles, "@/lib/defense/server": server, "next/navigation": { redirect: destination => { throw new Error(`redirect:${destination}`); } } });
  return { db, ...guard };
}
test("Las páginas de estudiante redirigen al equipo antes de mostrar funciones de entrega", async () => {
  for (const [role, home] of [["evaluator", "/evaluator"], ["admin", "/evaluator"], ["recruiter", "/recruiter"]]) { const guard = studentGuard(role); await assert.rejects(guard.requireStudentPage(guard.db, "user"), new RegExp(`redirect:${home}`)); }
  const student = studentGuard("student"); await student.requireStudentPage(student.db, "student");
});
test("Un evaluador no puede escribir entregas ni responder una entrevista como estudiante", async () => {
  for (const role of ["evaluator", "admin", "recruiter"]) { const guard = studentGuard(role); assert.equal((await guard.studentActionError(guard.db, "user")).status, 403); }
  const student = studentGuard("student"); assert.equal(await student.studentActionError(student.db, "student"), null);
  const failure = studentGuard(null, { message: "network" }); assert.equal((await failure.studentActionError(failure.db, "user")).status, 500);
});
test("Los endpoints de entregar y responder bloquean al evaluador antes de consultar evidencia", async () => {
  for (const [path, body] of [["src/app/api/submissions/route.ts", { action: "draft", challengeId: "11111111-1111-1111-1111-111111111111" }], ["src/app/api/interview-reviews/response/route.ts", { reviewId: "11111111-1111-1111-1111-111111111111", response: "Mi respuesta" }]]) {
    const calls = []; const db = { auth: { getClaims: async () => ({ data: { claims: { sub: "evaluator" } } }) }, from(table) { calls.push(table); return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { role: "evaluator" }, error: null }) }; } };
    const guard = load("src/lib/auth/student.ts", { "./dashboard": roles, "@/lib/defense/server": server, "next/navigation": {} });
    const api = load(path, { "@/lib/supabase/server": { createClient: async () => db }, "@/lib/auth/student": guard });
    const response = await api.POST(new Request("https://skillproof.test/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); assert.equal(response.status, 403); assert.deepEqual(calls, ["profiles"]);
  }
});
test("Las rutas antiguas de entrevistas redirigen al evaluador sin renderizar el historial del estudiante", async () => {
  for (const role of ["evaluator", "admin"]) {
    const db = { auth: { getUser: async () => ({ data: { user: { id: "staff" } }, error: null }) }, from() { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { role, display_name: "Equipo" }, error: null }) }; } };
    const layout = load("src/app/interviews/layout.tsx", { "@/lib/supabase/server": { createClient: async () => db }, "next/server": { connection: async () => {} }, "next/font/google": { Inter: () => ({ className: "inter" }) }, "next/navigation": { redirect: destination => { throw new Error(`redirect:${destination}`); } }, "./_components/profile-context": { InterviewProfileProvider: "provider" }, "./interviews.css": {} });
    const root = layout.default({ children: "student-history" }); const suspense = root.props.children; const content = suspense.props.children; await assert.rejects(content.type(content.props), /redirect:\/evaluator\/interviews/);
  }
});
test("La configuración privada del pasaporte rechaza al equipo antes de cualquier escritura", async () => {
  for (const role of ["evaluator", "admin", "recruiter"]) {
    const calls = [];
    const db = { auth: { getClaims: async () => ({ data: { claims: { sub: "user" } } }) }, from(table) { calls.push(table); return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { role, public_slug: "student", passport_public: false, recruiter_history_shared: false } }), update() { throw new Error("No debe escribir"); } }; } };
    const api = load("src/app/api/passport/me/route.ts", { "@/lib/supabase/server": { createClient: async () => db } });
    assert.equal((await api.GET()).status, 403);
    const response = await api.PATCH(new Request("https://skillproof.test/api/passport/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passport_public: true }) }));
    assert.equal(response.status, 403); assert.deepEqual(calls, ["profiles", "profiles"]);
  }
});
test("La API antigua de entrevistas delega el guardado y restringe el historial al estudiante", async () => {
  const id = "11111111-1111-1111-1111-111111111111";
  for (const role of ["evaluator", "student"]) {
    const calls = [];
    const db = { auth: { getClaims: async () => ({ data: { claims: { sub: id } } }) }, from(table) { calls.push(table); return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { role } }) }; } };
    const guard = load("src/lib/auth/student.ts", { "./dashboard": roles, "@/lib/defense/server": server, "next/navigation": {} });
    const save = async () => server.reply({ actual: true });
    const api = load("src/app/api/interview-reviews/route.ts", { "@/lib/supabase/server": { createClient: async () => db }, "@/lib/auth/student": guard, "../evaluator/interviews/route": { POST: save } });
    assert.equal(api.POST, save);
    const response = await api.GET(new Request("https://skillproof.test/api/interview-reviews?candidateId=22222222-2222-2222-2222-222222222222"));
    assert.equal(response.status, 403); assert.deepEqual(calls, ["profiles"]);
  }
});
