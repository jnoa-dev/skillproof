import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const localModule = { exports: {} };
  new Function("require", "module", "exports", code)(name => dependencies[name] || require(name), localModule, localModule.exports);
  return localModule.exports;
}
const model = load("src/lib/defense/model.ts");
const server = load("src/lib/defense/server.ts");
const roles = load("src/lib/auth/dashboard.ts");
const id = "11111111-1111-1111-1111-111111111111";
function api(path, { user = "candidate", role = "student", assigned = null, rpcError = null } = {}) {
  const calls = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null } }), getClaims: async () => ({ data: { claims: { sub: user } } }) },
    rpc: async (name, payload) => { calls.push([name, payload]); return { data: name === "get_defense_for_review" ? { session: null } : { config: null, session: null, server_time: "2026-10-31T00:00:00Z" }, error: rpcError }; },
    from(table) {
      calls.push(["table", table]);
      const query = {
        select() { return this; }, eq() { return this; },
        maybeSingle: async () => ({ data: table === "profiles" ? { role } : table === "evaluations" ? assigned && { evaluator_id: assigned } : table === "submissions" ? { id } : null, error: null }),
      };
      return query;
    },
  };
  return { ...load(path, { "@/lib/supabase/server": { createClient: async () => db }, "@/lib/defense/model": model, "@/lib/defense/server": server }), calls, db };
}
function post(data) { return new Request("https://skillproof.test/api/defense", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); }

test("El panel depende del rol persistido y no trata roles desconocidos como estudiantes", () => {
  assert.equal(roles.dashboardForRole("student"), "/dashboard");
  assert.equal(roles.dashboardForRole("evaluator"), "/evaluator");
  assert.equal(roles.dashboardForRole("admin"), "/evaluator");
  assert.equal(roles.dashboardForRole("recruiter"), "/recruiter");
  for (const value of [null, undefined, "evaluador", "owner", ""]) assert.equal(roles.dashboardForRole(value), null);
});
test("/dashboard redirige al evaluador antes de consultar datos del estudiante", async () => {
  for (const [role, destination] of [["evaluator", "/evaluator"], ["admin", "/evaluator"], ["recruiter", "/recruiter"]]) {
    const service = api("src/app/api/defense/route.ts", { role });
    const page = load("src/app/dashboard/page.tsx", {
      "@/lib/supabase/server": { createClient: async () => service.db },
      "@/lib/auth/dashboard": roles,
      "next/server": { connection: async () => {} },
      "next/font/google": { Inter: () => ({ className: "inter" }) },
      "next/navigation": { redirect: path => { throw new Error(`redirect:${path}`); } },
    });
    await assert.rejects(page.default(), new RegExp(`redirect:${destination}`));
    assert.deepEqual(service.calls, [["table", "profiles"]]);
  }
});
test("La defensa rechaza visitantes sin llamar a funciones de datos", async () => {
  const service = api("src/app/api/defense/route.ts", { user: null });
  assert.equal((await service.GET(new Request(`https://skillproof.test/api/defense?submissionId=${id}`))).status, 401);
  assert.deepEqual(service.calls, []);
});
test("La validación de respuestas y eventos rechaza solicitudes antes de acceder al servidor", async () => {
  for (const body of [
    { action: "start", payload: { accepted: false } },
    { action: "save", payload: { revision: -1, answers: {} } },
    { action: "save", payload: { revision: 1, answers: { "0": "x".repeat(10001) } } },
    { action: "save", payload: { revision: 1, answers: { "01": "texto" } } },
    { action: "event", payload: { kind: "exit", nonce: "no-uuid" } },
    { action: "event", payload: { kind: "hack", nonce: id } },
  ]) {
    const service = api("src/app/api/defense/route.ts");
    assert.equal((await service.POST(post({ submissionId: id, ...body }))).status, 400);
    assert.deepEqual(service.calls, []);
  }
});
test("No se propagan identidades proporcionadas por el cliente a la función de defensa", async () => {
  const service = api("src/app/api/defense/route.ts");
  const response = await service.POST(post({ submissionId: id, candidate_id: "otro", action: "start", payload: { accepted: true } }));
  assert.equal(response.status, 200);
  assert.deepEqual(service.calls, [["defense_action", { p_submission_id: id, p_action: "start", p_payload: { accepted: true } }]]);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
});
test("Una migración ausente tiene un error explícito sin filtrar detalles SQL", async () => {
  const service = api("src/app/api/defense/route.ts", { rpcError: { code: "PGRST202", message: "secret internal schema" } });
  const response = await service.GET(new Request(`https://skillproof.test/api/defense?submissionId=${id}`));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.unavailable, true);
  assert.match(body.error, /migración/);
  assert.doesNotMatch(body.error, /secret/);
});
test("Un conflicto de revisión exige recargar y no se anuncia como guardado", async () => {
  const service = api("src/app/api/defense/route.ts", { rpcError: { code: "40001" } });
  assert.equal((await service.POST(post({ submissionId: id, action: "save", payload: { revision: 1, answers: {} } }))).status, 409);
});
test("Estudiantes y reclutadores no obtienen permisos de revisión de defensas", async () => {
  for (const role of ["student", "recruiter"]) {
    const service = api("src/app/api/evaluator/defense/route.ts", { role });
    assert.equal((await service.GET(new Request(`https://skillproof.test/api/evaluator/defense?submissionId=${id}`))).status, 403);
    assert.deepEqual(service.calls, [["table", "profiles"]]);
  }
});
test("La revisión bloquea una asignación ajena antes de pedir las respuestas", async () => {
  const service = api("src/app/api/evaluator/defense/route.ts", { role: "evaluator", user: "reviewer", assigned: "other" });
  assert.equal((await service.GET(new Request(`https://skillproof.test/api/evaluator/defense?submissionId=${id}`))).status, 403);
  assert.equal(service.calls.some(([name]) => name === "get_defense_for_review"), false);
});
test("La revisión autorizada usa la función protegida, sin SELECT directo de respuestas", async () => {
  const service = api("src/app/api/evaluator/defense/route.ts", { role: "evaluator", user: "reviewer", assigned: "reviewer" });
  assert.equal((await service.GET(new Request(`https://skillproof.test/api/evaluator/defense?submissionId=${id}`))).status, 200);
  assert.deepEqual(service.calls.at(-1), ["get_defense_for_review", { p_submission_id: id }]);
  assert.equal(service.calls.some(([name, table]) => name === "table" && table === "defense_sessions"), false);
});
test("Configurar exige pesos válidos y preguntas consistentes incluso con entradas malformadas", () => {
  const config = model.defaultDefense(["Concurrencia", "Pruebas"]);
  assert.equal(model.validateConfig(config), null);
  for (const change of [{ questions: [null] }, { questions: [] }, { duration_minutes: 99 }, { weights: { code: 100, explanation: 100, clarity: 0 } }, { questions: [config.questions[0], config.questions[0]] }]) assert.ok(model.validateConfig({ ...config, ...change }));
  assert.equal(model.validAnswers(null), false);
  assert.equal(model.validAnswers({ "0": "válida" }), true);
});
test("El reloj usa el vencimiento y limita a cero; respuestas vacías no cuentan como completas", () => {
  assert.equal(model.remainingSeconds("2026-10-31T00:00:30Z", Date.parse("2026-10-31T00:00:00Z")), 30);
  assert.equal(model.remainingSeconds("2026-10-31T00:00:30Z", Date.parse("2026-10-31T00:01:00Z")), 0);
  assert.equal(model.answeredCount(model.defaultDefense(["A", "B"]).questions, { "0": " ".repeat(80), "1": "x".repeat(80) }), 1);
});
