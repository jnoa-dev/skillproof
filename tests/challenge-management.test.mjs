import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const local = { exports: {} }; new Function("require", "module", "exports", code)(name => dependencies[name] || require(name), local, local.exports); return local.exports;
}
const model = load("src/lib/challenge-management/model.ts");
const candidates = load("src/lib/evaluator/candidates.ts");
const server = load("src/lib/defense/server.ts");
const uuid = load("src/lib/defense/model.ts");
const id = "11111111-1111-1111-1111-111111111111";
const valid = { ...model.emptyChallenge(), title: "Caché distribuido", slug: "cache-distribuido", description: "Implementa un caché.", context: "Alta concurrencia.", difficulty: "intermediate", requirements: ["Coherencia"], deliverables: ["Repositorio"], criteria: [{ title: "Diseño", description: "Arquitectura", weight: 100, max_score: 4 }] };
test("Un borrador parcial admite secciones pendientes; activar exige completarlas", () => {
  const partial = { ...model.emptyChallenge(), title: "Prueba", slug: "prueba" };
  assert.deepEqual(model.validateChallenge(partial, false), {});
  assert.deepEqual(Object.keys(model.validateChallenge(partial, true)).sort(), ["context", "criteria", "deliverables", "description", "difficulty", "requirements"]);
  assert.deepEqual(model.validateChallenge(valid, true), {});
});
test("Los límites, identificadores y rúbricas inválidas no pasan la validación", () => {
  for (const slug of ["ab", "Con espacios", "../privado", "-inicio", "fin-", "dos--guiones", "a".repeat(31)]) assert.ok(model.validateChallenge({ ...valid, slug }, false).slug);
  for (const patch of [{ title: "" }, { title: "a".repeat(81) }, { context: "a".repeat(1001) }, { difficulty: "staff" }, { criteria: [null] }, { criteria: [{ ...valid.criteria[0], weight: 20 }] }]) assert.ok(Object.keys(model.validateChallenge({ ...valid, ...patch }, true)).length);
  assert.equal(model.slugFromTitle("¡Diseño de Caché Concurrente!"), "diseno-de-cache-concurrente");
});
function service({ role = "admin", user = true, rpcError = null } = {}) {
  const calls = [];
  const db = { auth: { getUser: async () => ({ data: { user: user ? { id } : null } }) }, from(table) { calls.push(["from", table]); return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { role }, error: null }) }; }, rpc: async (name, payload) => { calls.push([name, payload]); return { data: name === "challenge_slug_available" ? true : { challenge: valid }, error: rpcError }; } };
  const access = load("src/lib/evaluator/access.ts", { "@/lib/supabase/server": { createClient: async () => db }, "@/lib/defense/server": server });
  const api = load("src/app/api/evaluator/challenges/route.ts", { "@/lib/evaluator/access": access, "@/lib/defense/server": server, "@/lib/defense/model": uuid, "@/lib/challenge-management/model": model });
  return { ...api, calls };
}
function request(challenge, action = "save") { return new Request("https://skillproof.test/api/evaluator/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge, action }) }); }
test("Visitantes, estudiantes, evaluadores y reclutadores no pueden guardar desafíos", async () => {
  for (const [options, status] of [[{ user: false }, 401], [{ role: "student" }, 403], [{ role: "evaluator" }, 403], [{ role: "recruiter" }, 403]]) {
    const api = service(options); const response = await api.POST(request(valid)); assert.equal(response.status, status); assert.equal(api.calls.some(([name]) => name === "save_managed_challenge"), false); assert.match(response.headers.get("cache-control"), /private, no-store/);
  }
});
test("Los campos inválidos y activar borradores incompletos no producen escrituras", async () => {
  const api = service(); assert.equal((await api.POST(request({ ...valid, slug: "inválido" }))).status, 400); assert.equal((await api.POST(request({ ...model.emptyChallenge(), title: "Prueba", slug: "prueba" }, "activate"))).status, 400); assert.deepEqual(api.calls, []);
});
test("El administrador envía la revisión al servidor y no cambia el rol mediante el payload", async () => {
  const api = service(); const response = await api.POST(request({ ...valid, updated_by: "otro", role: "recruiter" })); assert.equal(response.status, 200); const write = api.calls.find(([name]) => name === "save_managed_challenge"); assert.equal(write[1].p_data.version, 0); assert.equal(write[1].p_action, "save");
});
test("Slug ocupado, conflicto, participación y migración ausente conservan errores explícitos", async () => {
  for (const [code, status] of [["23505", 409], ["40001", 409], ["55000", 409], ["PGRST202", 503]]) {
    const api = service({ rpcError: { code, message: "secret SQL" } }); const response = await api.POST(request(valid)); assert.equal(response.status, status); const body = await response.json(); assert.doesNotMatch(body.error, /secret SQL/); if (code === "23505") assert.equal(body.field, "slug");
  }
});
test("Consultar disponibilidad excluye el desafío propio y valida antes de consultar el slug", async () => {
  const api = service(); const response = await api.GET(new Request(`https://skillproof.test/api/evaluator/challenges?slug=cache&id=${id}`)); assert.equal(response.status, 200); assert.deepEqual(api.calls.at(-1), ["challenge_slug_available", { p_slug: "cache", p_id: id }]); assert.equal((await api.GET(new Request("https://skillproof.test/api/evaluator/challenges?slug=../x"))).status, 400);
});
test("Los filtros combinan nombre sin tildes, desafío y estados sin mutar el directorio", () => {
  const rows = [{ submission_id: "a", candidate_id: id, name: "Álex", challenge_id: "c", challenge_title: "Caché", evaluation_status: "finalized", interview_status: "draft", updated_at: "2026-10-31" }, { submission_id: "b", candidate_id: "other", name: null, challenge_id: "other", challenge_title: "API", evaluation_status: null, interview_status: null, updated_at: null }];
  assert.deepEqual(candidates.filterCandidates(rows, "alex", "c", "finalized", "draft", "recent").map(row => row.submission_id), ["a"]); assert.equal(candidates.filterCandidates(rows, "", "", "unknown", "unknown", "recent")[0].submission_id, "b"); assert.equal(rows[0].submission_id, "a");
});
test("CSV escapa comillas y evita fórmulas en hojas de cálculo", () => {
  assert.equal(candidates.csvCell('Una "prueba", sí'), '"Una ""prueba"", sí"'); for (const value of ["=HYPERLINK(x)", "+1", "-2", "@SUM(A1)", "  =1"]) assert.match(candidates.csvCell(value), /^"'/); assert.equal(candidates.csvCell("Álex"), '"Álex"');
});

function candidateService({ denied = false, names = [], evaluationError = false } = {}) {
  const calls = [];
  const data = { submissions: [{ id, user_id: id, challenge_id: id, updated_at: "2026-10-31" }], profiles: names, challenges: [{ id, title: "Caché" }], evaluations: [{ id, submission_id: id, status: "finalized", total_score: "3" }], interview_reviews: [], evaluation_scores: [{ evaluation_id: id, criterion_id: id, score: "3", notes: "Comentario visible" }], rubric_criteria: [{ id, title: "Diseño", max_score: 4 }] };
  const db = { from(table) { calls.push(["from", table]); const query = { select(columns) { calls.push([table, "select", columns]); return this; }, eq(key, value) { calls.push([table, "eq", key, value]); return this; }, in(key, value) { calls.push([table, "in", key, value]); return this; }, order() { return this; }, limit(value) { calls.push([table, "limit", value]); return this; }, then(resolve, reject) { return Promise.resolve({ data: data[table], error: table === "evaluations" && evaluationError ? { message: "sql secret" } : null }).then(resolve, reject); } }; return query; } };
  const api = load("src/app/api/evaluator/candidates/route.ts", { "@/lib/evaluator/access": { staffAccess: async () => denied ? { error: server.reply({ error: "Acceso denegado" }, 403) } : { db } }, "@/lib/defense/server": server, "@/lib/defense/model": uuid });
  return { ...api, calls };
}
test("El directorio solo consulta enviadas, limita resultados y no inventa identidad ni publicación", async () => {
  const api = candidateService(); const response = await api.GET(new Request("https://skillproof.test/api/evaluator/candidates")); assert.equal(response.status, 200); const body = await response.json(); assert.equal(body.candidates[0].name, null); assert.equal(body.candidates[0].interview_status, null); assert.equal(body.candidates[0].total_score, 3); assert.equal("passport_public" in body.candidates[0], false); assert.equal("email" in body.candidates[0], false); assert.ok(api.calls.some(c => c[0] === "submissions" && c[1] === "eq" && c[2] === "status" && c[3] === "submitted")); assert.ok(api.calls.some(c => c[0] === "submissions" && c[1] === "limit" && c[2] === 201)); assert.equal(api.calls.some(c => c[0] === "from" && c[1] === "evaluation_scores"), false);
});
test("Abrir un perfil filtra el candidato y consulta únicamente resultados visibles", async () => {
  const api = candidateService(); const response = await api.GET(new Request(`https://skillproof.test/api/evaluator/candidates?candidateId=${id}`)); const body = await response.json(); assert.ok(api.calls.some(c => c[0] === "submissions" && c[1] === "eq" && c[2] === "user_id" && c[3] === id)); assert.deepEqual(body.candidates[0].scores, [{ title: "Diseño", score: 3, max_score: 4, notes: "Comentario visible" }]);
});
test("Identificadores inválidos y acceso denegado no consultan candidatos", async () => {
  const invalid = candidateService(); assert.equal((await invalid.GET(new Request("https://skillproof.test/api/evaluator/candidates?candidateId=invalid"))).status, 400); assert.deepEqual(invalid.calls, []); const denied = candidateService({ denied: true }); assert.equal((await denied.GET(new Request("https://skillproof.test/api/evaluator/candidates"))).status, 403); assert.deepEqual(denied.calls, []);
});
test("Un error en las evaluaciones impide construir indicadores engañosos", async () => {
  const api = candidateService({ evaluationError: true }); const response = await api.GET(new Request("https://skillproof.test/api/evaluator/candidates")); assert.equal(response.status, 500); assert.equal("candidates" in await response.json(), false);
});
