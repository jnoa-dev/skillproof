import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const entregaId = "11111111-1111-1111-1111-111111111111";
const registro = { id: "entrevista", reviewer_id: "evaluador", status: "draft", understanding_score: null, adaptation_score: null, evidence: "", created_at: "2026-10-31", finalized_at: null };
const cuerpo = { submissionId: entregaId, action: "draft", understandingScore: null, adaptationScore: null, evidence: "" };

function servicio({ usuario = "evaluador", rol = "evaluator", candidato = "candidato", asignado = "evaluador", existente = null, conflicto = false } = {}) {
  const consultas = [];
  let guardado = existente;
  const supabase = {
    auth: { getUser: async () => ({ data: { user: usuario ? { id: usuario } : null }, error: null }) },
    from(tabla) {
      consultas.push(["from", tabla]);
      let operacion = "read";
      let valores;
      const filtros = [];
      function resultado() {
        if (tabla === "profiles") return { data: { role: rol, display_name: "Evaluador" }, error: null };
        if (tabla === "submissions") return { data: { id: entregaId, user_id: candidato }, error: null };
        if (tabla === "evaluations") return { data: asignado ? { evaluator_id: asignado } : null, error: null };
        if (tabla === "interview_reviews") {
          if (operacion !== "read") {
            if (conflicto && operacion === "update") return { data: null, error: null };
            guardado = { ...registro, ...guardado, ...valores };
            return { data: guardado, error: null };
          }
          return { data: guardado, error: null };
        }
        throw new Error(`Tabla inesperada: ${tabla}`);
      }
      const query = {
        select(columnas) { consultas.push([tabla, "select", columnas]); return this; },
        eq(campo, valor) { filtros.push([campo, valor]); consultas.push([tabla, "eq", campo, valor]); return this; },
        is(campo, valor) { filtros.push([campo, valor]); consultas.push([tabla, "is", campo, valor]); return this; },
        insert(datos) { operacion = "insert"; valores = datos; consultas.push([tabla, "insert", datos]); return this; },
        update(datos) { operacion = "update"; valores = datos; consultas.push([tabla, "update", datos]); return this; },
        order() { return this; },
        limit() { return this; },
        in(campo, datos) { consultas.push([tabla, "in", campo, datos]); return this; },
        then(resolve, reject) { return Promise.resolve({ data: tabla === "interview_reviews" ? (guardado ? [guardado] : []) : [], error: null }).then(resolve, reject); },
        maybeSingle: async () => resultado(),
      };
      return query;
    },
  };
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(readFileSync(new URL("../src/app/api/evaluator/interviews/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function("require", "module", "exports", codigo)(nombre => nombre === "@/lib/supabase/server" ? { createClient: async () => supabase } : require(nombre), modulo, modulo.exports);
  return { ...modulo.exports, consultas };
}
function peticion(datos) { return new Request("https://skillproof.test/api/evaluator/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }); }

test("Las entrevistas rechazan visitantes, estudiantes, autoentrevistas y asignaciones ajenas", async () => {
  for (const [opciones, status] of [[{ usuario: null }, 401], [{ rol: "student" }, 403], [{ candidato: "evaluador" }, 403], [{ asignado: "otra-persona" }, 403]]) {
    const api = servicio(opciones);
    const respuesta = await api.POST(peticion(cuerpo));
    assert.equal(respuesta.status, status);
    assert.equal(api.consultas.some(c => c[1] === "insert" || c[1] === "update"), false);
    assert.match(respuesta.headers.get("cache-control"), /no-store/);
  }
});

test("Validación de puntajes, longitud y finalización ocurre antes de escribir", async () => {
  for (const cambio of [{ understandingScore: 0 }, { adaptationScore: 6 }, { understandingScore: "4" }, { evidence: "x".repeat(10001) }, { action: "finalize", evidence: "corta" }, { submissionId: "invalida" }]) {
    const api = servicio();
    assert.equal((await api.POST(peticion({ ...cuerpo, ...cambio }))).status, 400);
    assert.deepEqual(api.consultas, []);
  }
});

test("El borrador obtiene los participantes del servidor e ignora identidades enviadas", async () => {
  const api = servicio();
  const respuesta = await api.POST(peticion({ ...cuerpo, candidate_id: "intruso", reviewer_id: "admin" }));
  assert.equal(respuesta.status, 200);
  const escritura = api.consultas.find(c => c[1] === "insert")[2];
  assert.equal(escritura.candidate_id, "candidato");
  assert.equal(escritura.reviewer_id, "evaluador");
  assert.equal(escritura.status, "draft");
});

test("Finalizar usa el borrador propio y el trigger, sin inventar fecha de finalización", async () => {
  const api = servicio({ existente: registro });
  const respuesta = await api.POST(peticion({ ...cuerpo, action: "finalize", understandingScore: 4, adaptationScore: 3, evidence: "Observaciones técnicas suficientes sobre la entrevista." }));
  assert.equal(respuesta.status, 200);
  const escritura = api.consultas.find(c => c[1] === "update")[2];
  assert.equal(escritura.status, "finalized");
  assert.equal("finalized_at" in escritura, false);
  assert.ok(api.consultas.some(c => c[1] === "eq" && c[2] === "reviewer_id" && c[3] === "evaluador"));
  assert.ok(api.consultas.some(c => c[1] === "eq" && c[2] === "status" && c[3] === "draft"));
});

test("Una entrevista finalizada y los cambios concurrentes no se sobrescriben", async () => {
  const api = servicio({ existente: { ...registro, status: "finalized" } });
  assert.equal((await api.POST(peticion(cuerpo))).status, 409);
  assert.equal(api.consultas.some(c => c[1] === "update"), false);
  const conflicto = servicio({ existente: registro, conflicto: true });
  assert.equal((await conflicto.POST(peticion(cuerpo))).status, 409);
});

test("El historial se limita a la entrega autorizada y a las filas visibles por RLS", async () => {
  const api = servicio({ existente: registro });
  const respuesta = await api.GET(new Request(`https://skillproof.test/api/evaluator/interviews?submissionId=${entregaId}`));
  assert.equal(respuesta.status, 200);
  const datos = await respuesta.json();
  assert.equal(datos.interviews.length, 1);
  assert.equal(datos.interviews[0].own, true);
  assert.equal(datos.interviews[0].reviewer_name, "Evaluador");
  assert.equal(datos.interviews[0].response, null);
  assert.equal("reviewer_id" in datos.interviews[0], false);
  assert.ok(api.consultas.some(c => c[0] === "interview_reviews" && c[1] === "eq" && c[2] === "submission_id" && c[3] === entregaId));
});

test("Un historial vacío no se confunde con un fallo ni inventa entrevistas", async () => {
  const respuesta = await servicio().GET(new Request(`https://skillproof.test/api/evaluator/interviews?submissionId=${entregaId}`));
  assert.deepEqual((await respuesta.json()).interviews, []);
  const invalida = await servicio().GET(new Request("https://skillproof.test/api/evaluator/interviews?submissionId=otra"));
  assert.equal(invalida.status, 400);
});
