import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { NextRequest } from "next/server.js";

const paquete = createRequire(import.meta.url);
function cargar(ruta, dependencias = {}) {
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  new Function("require", "module", "exports", codigo)(nombre => nombre in dependencias ? dependencias[nombre] : paquete(nombre), modulo, modulo.exports);
  return modulo.exports;
}
const datos = cargar("src/lib/passport/datos.ts");

test("El adaptador no inventa identidad, publicación, puntuación ni escala", () => {
  const vacio = datos.adaptarPasaporte({ datos_desconocidos: "texto", private_notes: "nota interna" });
  assert.equal(vacio.nombre, "");
  assert.equal(vacio.evaluado, false);
  assert.equal(vacio.fecha, "");
  assert.deepEqual(vacio.competencias, []);
  assert.equal(JSON.stringify(vacio).includes("nota interna"), false);
  for (const valor of [null, undefined, [], "texto", 123]) assert.equal(datos.adaptarPasaporte(valor).nombre, "");
});

test("Se reconocen datos públicos estructurados sin confundir finalización con publicación", () => {
  const pasaporte = datos.adaptarPasaporte({ student: { display_name: "Nombre público" }, challenge: { title: "Desafío público" }, evaluation: { status: "finalized", finalized_at: "2026-10-31", summary: "Feedback público" }, scores: [{ criterion: { title: "Arquitectura", max_score: 4 }, score: 3, notes: "Comentario público" }] });
  assert.equal(pasaporte.nombre, "Nombre público");
  assert.equal(pasaporte.desafio, "Desafío público");
  assert.equal(pasaporte.evaluado, true);
  assert.equal(pasaporte.fecha, "");
  assert.equal(pasaporte.competencias[0].puntuacion, 3);
  assert.equal(pasaporte.competencias[0].maximo, 4);
  assert.equal(pasaporte.competencias[0].comentario, "Comentario público");
  assert.equal(datos.adaptarPasaporte([{ student_name: "Nombre" }]).nombre, "Nombre");
});

test("Las evidencias rechazan protocolos ejecutables, credenciales y destinos locales", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,texto", "http://github.com/user/repo", "https://clave@github.com/user/repo", "https://localhost/repo", "https://127.0.0.1/repo", "https://10.0.0.1/repo", "https://equipo.local/repo", null]) assert.equal(datos.enlacePublico(url), null);
  assert.equal(datos.enlacePublico("https://github.com/user/repo"), "https://github.com/user/repo");
});

function api(resultado) {
  let llamadas = 0;
  const modulo = cargar("src/app/api/passport/[slug]/route.ts", {
    "@supabase/supabase-js": { createClient: (_url, _clave, opciones) => {
      assert.equal(opciones.auth.persistSession, false);
      assert.equal(opciones.auth.autoRefreshToken, false);
      assert.equal(opciones.auth.detectSessionInUrl, false);
      assert.equal(opciones.global.headers, undefined);
      return { rpc: async (nombre, parametros) => {
        llamadas++;
        assert.equal(nombre, "get_public_passport");
        assert.equal(parametros.p_slug, "publico-valido");
        if (resultado instanceof Error) throw resultado;
        return resultado;
      } };
    } },
  });
  return { GET: modulo.GET, llamadas: () => llamadas };
}

test("La API valida los identificadores antes de consultar Supabase", async () => {
  const servicio = api({ data: {}, error: null });
  for (const slug of ["../privado", "mayusculas-A", "", "a".repeat(201)]) {
    const respuesta = await servicio.GET(new Request("https://skillproof.test"), { params: Promise.resolve({ slug }) });
    assert.equal(respuesta.status, 404);
    assert.match(respuesta.headers.get("cache-control"), /no-store/);
  }
  assert.equal(servicio.llamadas(), 0);
});

test("La API devuelve ausencia y errores sin filtrar información interna", async () => {
  for (const [resultado, estado] of [[{ data: null, error: null }, 404], [{ data: [], error: null }, 404], [{ data: null, error: { message: "secreto" } }, 500], [new Error("secreto"), 503]]) {
    const respuesta = await api(resultado).GET(new Request("https://skillproof.test"), { params: Promise.resolve({ slug: "publico-valido" }) });
    assert.equal(respuesta.status, estado);
    assert.match(respuesta.headers.get("cache-control"), /no-store/);
    assert.equal((await respuesta.text()).includes("secreto"), false);
  }
});

test("La API utiliza exclusivamente el resultado de la función pública", async () => {
  const publico = { student_name: "Persona pública", challenge_title: "Desafío" };
  const respuesta = await api({ data: publico, error: null }).GET(new Request("https://skillproof.test", { headers: { cookie: "sesion-privada=administrador" } }), { params: Promise.resolve({ slug: "publico-valido" }) });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { passport: publico });
});

test("El proxy no consulta ni renueva sesiones al visitar pasaportes públicos", async () => {
  const modulo = cargar("src/proxy.ts", {
    "@/lib/supabase/sesion": {},
    "@supabase/ssr": { createServerClient() { throw new Error("No debe consultar autenticación privada"); } },
  });
  for (const ruta of ["/passport", "/passport/publico-valido", "/api/passport/publico-valido"]) {
    const respuesta = await modulo.proxy(new NextRequest(`https://skillproof.test${ruta}`));
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get("set-cookie"), null);
  }
});
