import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";

const require = createRequire(import.meta.url);
function cargar(ruta, dependencias = {}, entorno = {}) {
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }, fileName: ruta }).outputText;
  new Function("require", "module", "exports", ...Object.keys(entorno), codigo)(nombre => nombre in dependencias ? dependencias[nombre] : require(nombre), modulo, modulo.exports, ...Object.values(entorno));
  return modulo.exports;
}
const { filtrarEntregas, evaluacionEnCurso } = cargar("src/lib/evaluator/dashboard.ts");
const fila = (id, cambios = {}) => ({ id, candidate_name: "Álex Torres", challenge_id: "cache", challenge_title: "Caché distribuido", created_at: "2026-10-01", updated_at: "2026-10-02", evaluation_status: null, evaluation_updated_at: null, own_evaluation: false, ...cambios });

test("Los filtros combinan estado, desafío y búsqueda sin tildes sin mutar los datos", () => {
  const filas = [fila("a"), fila("b", { evaluation_status: "draft" }), fila("c", { challenge_id: "api", candidate_name: "Marta" })];
  assert.deepEqual(filtrarEntregas(filas, "pending", "alex cache", "cache", "recent").map(f => f.id), ["a"]);
  assert.deepEqual(filtrarEntregas(filas, "all", "sin coincidencias", "", "recent"), []);
  assert.deepEqual(filas.map(f => f.id), ["a", "b", "c"]);
});

test("La continuación solo selecciona el borrador propio más reciente", () => {
  const filas = [fila("ajeno", { evaluation_status: "draft", evaluation_updated_at: "2026-10-31" }), fila("propio", { own_evaluation: true, evaluation_status: "draft", evaluation_updated_at: "2026-10-30" }), fila("final", { own_evaluation: true, evaluation_status: "finalized", evaluation_updated_at: "2026-10-31" })];
  assert.equal(evaluacionEnCurso(filas).id, "propio");
  assert.equal(evaluacionEnCurso([]), null);
});

test("La ordenación maneja nombres ocultos y fechas ausentes", () => {
  const filas = [fila("a", { created_at: null, candidate_name: null }), fila("b", { created_at: "2026-10-30", candidate_name: "Ana" })];
  assert.deepEqual(filtrarEntregas(filas, "all", "", "", "recent").map(f => f.id), ["b", "a"]);
  assert.deepEqual(filtrarEntregas(filas, "all", "", "", "oldest").map(f => f.id), ["a", "b"]);
});

function api({ usuario = "evaluador", rol = "evaluator", tablas = {}, errorRol = null } = {}) {
  const consultas = [];
  const predeterminadas = {
    submissions: { data: [{ id: "entrega", user_id: "candidato", challenge_id: "cache", created_at: "2026-10-01", updated_at: "2026-10-02" }], error: null },
    profiles: { data: [], error: null },
    challenges: { data: [{ id: "cache", title: "Caché distribuido" }], error: null },
    evaluations: { data: [], error: null },
    ...tablas,
  };
  const cliente = {
    auth: { getClaims: async () => ({ data: { claims: { sub: usuario } }, error: null }) },
    from(tabla) {
      consultas.push(["from", tabla]);
      const consulta = {
        select(columnas) { consultas.push([tabla, "select", columnas]); return this; },
        eq(campo, valor) { consultas.push([tabla, "eq", campo, valor]); return this; },
        order() { return this; },
        limit(valor) { consultas.push([tabla, "limit", valor]); return this; },
        in(campo, valores) { consultas.push([tabla, "in", campo, valores]); return this; },
        maybeSingle: async () => ({ data: { role: rol }, error: errorRol }),
        then(resolve, reject) { return Promise.resolve(predeterminadas[tabla]).then(resolve, reject); },
      };
      return consulta;
    },
  };
  return { consultas, GET: cargar("src/app/api/evaluator/submissions/route.ts", { "@/lib/supabase/server": { createClient: async () => cliente } }).GET };
}

test("La API rechaza visitantes y estudiantes antes de consultar entregas", async () => {
  for (const [opciones, status] of [[{ usuario: null }, 401], [{ rol: "student" }, 403], [{ errorRol: { message: "privado" } }, 500]]) {
    const servicio = api(opciones);
    const respuesta = await servicio.GET();
    assert.equal(respuesta.status, status);
    assert.equal(servicio.consultas.some(c => c[0] === "from" && c[1] === "submissions"), false);
    assert.match(respuesta.headers.get("cache-control"), /no-store/);
  }
});

test("La API solo consulta enviadas y no inventa nombres o evaluaciones ocultas por RLS", async () => {
  const servicio = api();
  const respuesta = await servicio.GET();
  const cuerpo = await respuesta.json();
  assert.equal(respuesta.status, 200);
  assert.ok(servicio.consultas.some(c => c[0] === "submissions" && c[1] === "eq" && c[2] === "status" && c[3] === "submitted"));
  assert.equal(cuerpo.submissions[0].candidate_name, null);
  assert.equal(cuerpo.submissions[0].evaluation_status, null);
  assert.equal(cuerpo.submissions[0].own_evaluation, false);
  assert.equal("github_repo_url" in cuerpo.submissions[0], false);
  assert.equal("user_id" in cuerpo.submissions[0], false);
});

test("Las evaluaciones visibles distinguen borrador propio y finalización", async () => {
  const servicio = api({ tablas: { evaluations: { data: [{ submission_id: "entrega", evaluator_id: "evaluador", status: "draft", updated_at: "2026-10-30" }], error: null } } });
  const fila = (await (await servicio.GET()).json()).submissions[0];
  assert.equal(fila.own_evaluation, true);
  assert.equal(fila.evaluation_status, "draft");
  assert.equal(fila.evaluation_updated_at, "2026-10-30");
});

test("Los errores de estado bloquean indicadores falsos; los de nombres son parciales", async () => {
  const fallo = await api({ tablas: { evaluations: { data: null, error: { message: "secreto" } } } }).GET();
  assert.equal(fallo.status, 500);
  assert.equal(JSON.stringify(await fallo.json()).includes("secreto"), false);
  const parcial = await api({ tablas: { profiles: { data: null, error: { message: "secreto" } } } }).GET();
  const cuerpo = await parcial.json();
  assert.equal(parcial.status, 200);
  assert.equal(cuerpo.warnings.length, 1);
  assert.equal(cuerpo.submissions[0].candidate_name, null);
});

test("El límite de 100 se indica explícitamente sin fabricar un total global", async () => {
  const data = Array.from({ length: 101 }, (_, n) => ({ id: `entrega-${n}`, user_id: "candidato", challenge_id: "cache" }));
  const respuesta = await api({ tablas: { submissions: { data, error: null } } }).GET();
  const cuerpo = await respuesta.json();
  assert.equal(cuerpo.submissions.length, 100);
  assert.equal(cuerpo.limited, true);
});

function vistaDashboard(respuestas) {
  const valores = [];
  let indice = 0;
  let anteriores;
  let efecto;
  let limpiar;
  let componente;
  const navegacion = [];
  const deps = {
    react: { ...React, useState(inicial) { const posicion = indice++; if (!(posicion in valores)) valores[posicion] = inicial; return [valores[posicion], nuevo => { valores[posicion] = typeof nuevo === "function" ? nuevo(valores[posicion]) : nuevo; }]; }, useEffect(callback, dependencias) { if (!anteriores || anteriores[0] !== dependencias[0]) { anteriores = dependencias; efecto = callback; } } },
    "next/link": { __esModule: true, default: "enlace" },
    "next/navigation": { useRouter: () => ({ push: valor => navegacion.push(valor), replace: valor => navegacion.push(valor) }), useSearchParams: () => new URLSearchParams() },
    "./states": { AccesoEvaluador: "acceso", ErrorPanelEvaluador: "error-panel", ModalEstadoEvaluador: "modal-estado" },
    "@/lib/evaluator/dashboard": cargar("src/lib/evaluator/dashboard.ts"),
  };
  componente = cargar("src/components/evaluator/dashboard.tsx", deps, { fetch: async () => {
    const respuesta = respuestas.shift();
    assert.ok(respuesta, "Falta respuesta simulada");
    if (respuesta instanceof Error) throw respuesta;
    return { status: respuesta.status, ok: respuesta.status === 200, json: async () => respuesta.body };
  } }).default;
  function renderizar() { indice = 0; return componente(); }
  async function resolver() { if (efecto) { limpiar?.(); const callback = efecto; efecto = null; limpiar = callback(); } await new Promise(setImmediate); return renderizar(); }
  return { renderizar, resolver, navegacion };
}
function nodos(elemento, tipo) {
  if (!React.isValidElement(elemento)) return [];
  return [...(elemento.type === tipo ? [elemento] : []), ...React.Children.toArray(elemento.props.children).flatMap(hijo => nodos(hijo, tipo))];
}
const datosVista = { submissions: [fila("11111111-1111-1111-1111-111111111111")], limited: false, warnings: [] };

test("Una sesión caducada retira la tabla y presenta el aviso de acceso", async () => {
  const vista = vistaDashboard([{ status: 200, body: datosVista }, { status: 401, body: { error: "Inicia sesión" } }]);
  vista.renderizar();
  const cargada = await vista.resolver();
  assert.equal(nodos(cargada, "table").length, 1);
  nodos(cargada, "button").find(n => n.props.children === "↻ Actualizar panel" || React.Children.toArray(n.props.children).includes("↻ Actualizar panel")).props.onClick();
  vista.renderizar();
  const caducada = await vista.resolver();
  assert.equal(nodos(caducada, "table").length, 0);
  assert.equal(nodos(caducada, "modal-estado")[0].props.tipo, "sesion");
});

test("Una actualización fallida oculta la tabla y marca los indicadores anteriores como desactualizados", async () => {
  const vista = vistaDashboard([{ status: 200, body: datosVista }, new Error("Sin conexión")]);
  vista.renderizar();
  const cargada = await vista.resolver();
  nodos(cargada, "button").find(n => React.Children.toArray(n.props.children).includes("↻ Actualizar panel")).props.onClick();
  vista.renderizar();
  const fallida = await vista.resolver();
  assert.equal(nodos(fallida, "table").length, 0);
  assert.equal(nodos(fallida, "error-panel")[0].props.parcial, true);
});

test("Una entrega inaccesible abre el aviso y nunca navega a la revisión", async () => {
  const vista = vistaDashboard([{ status: 200, body: datosVista }, { status: 403, body: { error: "No disponible" } }]);
  vista.renderizar();
  const cargada = await vista.resolver();
  const enlace = nodos(cargada, "enlace").find(n => n.props.href.startsWith("/evaluator/submissions/"));
  enlace.props.onClick({ button: 0, preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(nodos(vista.renderizar(), "modal-estado")[0].props.tipo, "entrega");
  assert.deepEqual(vista.navegacion, []);
});
