import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { NextRequest } from "next/server.js";
import ts from "typescript";

const cargarPaquete = createRequire(import.meta.url);

// Ejecuta los módulos locales en memoria, con servicios simulados y sin conexiones de red.
function cargarArchivo(ruta, dependencias = {}, entorno = {}) {
  const codigo = ts.transpileModule(readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const modulo = { exports: {} };
  const nombres = Object.keys(entorno);
  new Function("require", "module", "exports", ...nombres, codigo)(
    nombre => nombre in dependencias ? dependencias[nombre] : cargarPaquete(nombre),
    modulo, modulo.exports, ...Object.values(entorno),
  );
  return modulo.exports;
}

const sesion = cargarArchivo("src/lib/supabase/sesion.ts");

test("Recordarme usa 30 días; sin marcar no genera una cookie persistente", () => {
  const opciones = { path: "/", sameSite: "lax", secure: true, maxAge: 999, expires: new Date(Date.now() + 60000) };
  const temporal = sesion.opcionesSesion(opciones, "no");
  assert.equal(temporal.maxAge, undefined);
  assert.equal(temporal.expires, undefined);
  assert.equal(temporal.secure, true);
  assert.equal(temporal.sameSite, "lax");
  const persistente = sesion.opcionesSesion(opciones, "si");
  assert.equal(persistente.maxAge, 30 * 24 * 60 * 60);
  assert.equal(persistente.expires, undefined);
  assert.equal(opciones.maxAge, 999);
  assert.equal(sesion.opcionesSesion(opciones, undefined), opciones);
});

test("La preferencia nunca convierte una eliminación en una cookie activa", () => {
  for (const opciones of [{ maxAge: 0 }, { maxAge: -1 }, { expires: new Date(0) }]) {
    for (const preferencia of ["si", "no"]) {
      assert.equal(sesion.opcionesSesion(opciones, preferencia), opciones);
    }
  }
});

test("El navegador aplica la preferencia actual a cada renovación y fragmento de cookie", () => {
  let opcionesCliente;
  const escrituras = [];
  const cookies = new Map();
  const documento = {
    get cookie() { return [...cookies].map(([nombre, valor]) => `${nombre}=${valor}`).join("; "); },
    set cookie(valor) {
      escrituras.push(valor);
      const [par] = valor.split(";");
      const separador = par.indexOf("=");
      cookies.set(par.slice(0, separador), par.slice(separador + 1));
    },
  };
  const ssr = cargarPaquete("@supabase/ssr");
  const cliente = cargarArchivo("src/lib/supabase/client.ts", {
    "@supabase/ssr": { ...ssr, createBrowserClient: (_url, _clave, opciones) => { opcionesCliente = opciones; return {}; } },
    "./sesion": sesion,
  }, {
    document: documento,
    window: { location: { protocol: "https:" } },
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://proyecto.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "clave-publica-de-prueba" } },
  });
  cliente.createClient();
  cliente.guardarPreferenciaSesion(true);
  opcionesCliente.cookies.setAll([{ name: "sb-auth.0", value: "fragmento", options: { maxAge: 999, path: "/" } }]);
  assert.match(escrituras.at(-1), /Max-Age=2592000/);
  assert.match(escrituras.at(-1), /Secure/);
  cliente.guardarPreferenciaSesion(false);
  opcionesCliente.cookies.setAll([{ name: "sb-auth.1", value: "fragmento", options: { maxAge: 999, path: "/" } }]);
  assert.doesNotMatch(escrituras.at(-1), /Max-Age|Expires/);
  opcionesCliente.cookies.setAll([{ name: "sb-auth.0", value: "", options: { maxAge: 0, path: "/" } }]);
  assert.match(escrituras.at(-1), /Max-Age=0/);
});

test("El cliente del servidor conserva la preferencia al renovar la sesión", async () => {
  for (const preferencia of ["si", "no"]) {
    const escrituras = [];
    const servidor = cargarArchivo("src/lib/supabase/server.ts", {
      "./sesion": sesion,
      "next/headers": { cookies: async () => ({
        get: () => ({ value: preferencia }),
        getAll: () => [],
        set: (...argumentos) => escrituras.push(argumentos),
      }) },
      "@supabase/ssr": { createServerClient: (_url, _clave, opciones) => {
        opciones.cookies.setAll([{ name: "sb-auth", value: "renovado", options: { maxAge: 999, path: "/" } }]);
        return {};
      } },
    }, { process: { env: { NODE_ENV: "production" } } });
    await servidor.createClient();
    assert.equal(escrituras[0][2].maxAge, preferencia === "si" ? 2592000 : undefined);
    assert.equal(escrituras[0][2].secure, true);
  }
});

test("El proxy conserva la duración elegida y las cabeceras privadas de Supabase", async () => {
  for (const preferencia of ["si", "no"]) {
    const modulo = cargarArchivo("src/proxy.ts", {
      "@/lib/supabase/sesion": sesion,
      "@supabase/ssr": { createServerClient: (_url, _clave, opciones) => ({ auth: {
        getClaims: async () => {
          opciones.cookies.setAll([{ name: "sb-auth", value: "renovado", options: { maxAge: 999, path: "/" } }], { "Cache-Control": "private, no-store" });
          return { data: { claims: { sub: "usuario" } } };
        },
      } }) },
    });
    const peticion = new NextRequest("https://skillproof.test/dashboard", { headers: { cookie: `${sesion.COOKIE_RECORDARME}=${preferencia}` } });
    const respuesta = await modulo.proxy(peticion);
    assert.equal(respuesta.cookies.get("sb-auth").maxAge, preferencia === "si" ? 2592000 : undefined);
    assert.equal(respuesta.cookies.get("sb-auth").secure, true);
    assert.equal(respuesta.headers.get("cache-control"), "private, no-store");
  }
});

function retorno(respuesta) {
  return cargarArchivo("src/app/auth/callback/route.ts", {
    "@/lib/supabase/server": { createClient: async () => ({ auth: { exchangeCodeForSession: respuesta } }) },
  }).GET;
}

test("El retorno exige un código válido y no filtra errores ni admite redirecciones externas", async () => {
  const GET = retorno(async codigo => {
    assert.equal(codigo, "codigo-valido");
    return { data: { session: { user: { id: "usuario-prueba" } } }, error: null };
  });
  const respuesta = await GET(new NextRequest("https://skillproof.test/auth/callback?code=codigo-valido&next=https://ajeno.test"));
  assert.equal(respuesta.headers.get("location"), "https://skillproof.test/dashboard");
  assert.match(respuesta.headers.get("cache-control"), /no-store/);
  assert.equal(respuesta.headers.get("referrer-policy"), "no-referrer");
  const recuperar = await GET(new NextRequest("https://skillproof.test/auth/callback?code=codigo-valido&flujo=recuperacion"));
  assert.equal(recuperar.headers.get("location"), "https://skillproof.test/login?estado=restablecer");
  for (const consulta of ["", "?error=access_denied&error_description=secreto", "?flujo=recuperacion"]) {
    const error = await GET(new NextRequest(`https://skillproof.test/auth/callback${consulta}`));
    assert.equal(error.headers.get("location"), "https://skillproof.test/login?error=enlace");
  }
  for (const servicio of [async () => ({ data: { session: null }, error: { message: "secreto" } }), async () => { throw new Error("secreto"); }]) {
    const error = await retorno(servicio)(new NextRequest("https://skillproof.test/auth/callback?code=codigo-invalido"));
    assert.equal(error.headers.get("location"), "https://skillproof.test/login?error=enlace");
  }
});

function nodos(elemento, tipo) {
  if (!React.isValidElement(elemento)) return [];
  return [...(elemento.type === tipo ? [elemento] : []), ...React.Children.toArray(elemento.props.children).flatMap(hijo => nodos(hijo, tipo))];
}

function pantalla({ consulta = "", auth = {}, configuracion = { external: { google: true, github: true } }, peticion } = {}) {
  const valores = [];
  const referencias = [];
  let indice = 0;
  let indiceReferencia = 0;
  const navegacion = [];
  const preferencias = [];
  const solicitudes = [];
  const pagina = cargarArchivo("src/app/login/page.tsx", {
    react: {
      ...React,
      useState(inicial) {
        const posicion = indice++;
        if (!(posicion in valores)) valores[posicion] = inicial;
        return [valores[posicion], nuevo => { valores[posicion] = typeof nuevo === "function" ? nuevo(valores[posicion]) : nuevo; }];
      },
      useRef(inicial) {
        const posicion = indiceReferencia++;
        return referencias[posicion] ??= { current: inicial };
      },
    },
    "next/navigation": {
      useSearchParams: () => new URLSearchParams(consulta),
      useRouter: () => ({ push: ruta => navegacion.push(ruta), replace: ruta => navegacion.push(ruta), refresh() {} }),
    },
    "@/lib/supabase/client": { createClient: () => ({ auth }), guardarPreferenciaSesion: valor => preferencias.push(valor) },
  }, {
    window: { location: { origin: "https://skillproof.test", assign: ruta => navegacion.push(ruta) } },
    fetch: peticion ?? (async () => ({ ok: true, json: async () => configuracion })),
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://proyecto.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "clave-publica-de-prueba" } },
  });
  const Formulario = pagina.default().props.children.type;
  function renderizar() { indice = 0; indiceReferencia = 0; return Formulario(); }
  function cambiar(nombre, valor) {
    const campo = nodos(renderizar(), "input").find(nodo => nodo.props.name === nombre);
    campo.props.onChange({ target: { value: valor } });
  }
  function boton(texto) {
    return nodos(renderizar(), "button").find(nodo => React.Children.toArray(nodo.props.children).includes(texto));
  }
  async function enviar() {
    solicitudes.push("enviar");
    await nodos(renderizar(), "form")[0].props.onSubmit({ preventDefault() {} });
  }
  return { renderizar, cambiar, boton, enviar, navegacion, preferencias, solicitudes };
}

test("El login respeta Recordarme y normaliza solo el correo", async () => {
  let argumentos;
  const vista = pantalla({ auth: { signInWithPassword: async datos => { argumentos = datos; return { error: null }; } } });
  vista.cambiar("correo", " persona@dominio.test ");
  vista.cambiar("contrasena", " clave segura ");
  nodos(vista.renderizar(), "input").find(nodo => nodo.props.type === "checkbox").props.onChange({ target: { checked: true } });
  await vista.enviar();
  assert.deepEqual(argumentos, { email: "persona@dominio.test", password: " clave segura " });
  assert.deepEqual(vista.preferencias, [true]);
  assert.deepEqual(vista.navegacion, ["/dashboard"]);
});

test("La recuperación no revela si existe la cuenta y genera un retorno local", async () => {
  let argumentos;
  const vista = pantalla({ auth: { resetPasswordForEmail: async (...datos) => { argumentos = datos; return { error: { code: "user_not_found" } }; } } });
  vista.boton("¿Olvidaste tu contraseña?").props.onClick();
  assert.equal(nodos(vista.renderizar(), "input").length, 1);
  vista.cambiar("correo", "persona@dominio.test");
  await vista.enviar();
  assert.equal(argumentos[1].redirectTo, "https://skillproof.test/auth/callback?flujo=recuperacion");
  assert.equal(nodos(vista.renderizar(), "form").length, 0);
  assert.ok(nodos(vista.renderizar(), "p").some(nodo => String(nodo.props.children).includes("Si el correo está registrado")));
});

test("Restablecer exige un usuario validado y cierra las sesiones tras actualizar", async () => {
  let cambios = 0;
  const sinSesion = pantalla({ consulta: "estado=restablecer", auth: { getUser: async () => ({ data: { user: null }, error: null }), updateUser: async () => { cambios++; } } });
  await sinSesion.enviar();
  assert.equal(cambios, 0);
  const operaciones = [];
  const vista = pantalla({ consulta: "estado=restablecer", auth: {
    getUser: async () => ({ data: { user: { id: "usuario" } }, error: null }),
    updateUser: async datos => { operaciones.push(datos); return { error: null }; },
    signOut: async datos => { operaciones.push(datos); return { error: null }; },
  } });
  vista.cambiar("contrasena", "nueva clave segura");
  await vista.enviar();
  assert.deepEqual(operaciones, [{ password: "nueva clave segura" }, { scope: "global" }]);
  assert.deepEqual(vista.navegacion, ["/login"]);
});

test("OAuth muestra indisponibilidad sin redirigir si el proveedor está desactivado", async () => {
  const vista = pantalla({ configuracion: { external: { google: false } } });
  await vista.boton("Continuar con Google").props.onClick();
  assert.deepEqual(vista.navegacion, []);
  assert.ok(nodos(vista.renderizar(), "span").some(nodo => String(nodo.props.children).includes("no está disponible")));
});

test("OAuth habilitado inicia PKCE con el retorno fijo de la aplicación", async () => {
  let argumentos;
  const vista = pantalla({ auth: { signInWithOAuth: async datos => { argumentos = datos; return { data: { url: "https://proyecto.test/auth/v1/authorize" }, error: null }; } } });
  await vista.boton("Continuar con GitHub").props.onClick();
  assert.equal(argumentos.provider, "github");
  assert.equal(argumentos.options.redirectTo, "https://skillproof.test/auth/callback");
  assert.equal(argumentos.options.skipBrowserRedirect, true);
  assert.deepEqual(vista.navegacion, ["https://proyecto.test/auth/v1/authorize"]);
  assert.equal(nodos(vista.renderizar(), "button").find(nodo => nodo.props.type === "submit").props.disabled, true);
});

test("Los errores de red permiten reintentar, conservan datos y desbloquean controles", async () => {
  const vista = pantalla({ auth: { signInWithPassword: async () => { throw new TypeError("fallo de red"); } } });
  vista.cambiar("correo", "persona@dominio.test");
  vista.cambiar("contrasena", "clave segura");
  await vista.enviar();
  assert.ok(vista.boton("Reintentar"));
  assert.equal(nodos(vista.renderizar(), "input").find(nodo => nodo.props.name === "contrasena").props.value, "clave segura");
  assert.equal(nodos(vista.renderizar(), "button").find(nodo => nodo.props.type === "submit").props.disabled, false);
});

test("El bloqueo inmediato evita solicitudes simultáneas incluso antes del render", async () => {
  let resolver;
  let llamadas = 0;
  const espera = new Promise(resolucion => { resolver = resolucion; });
  const vista = pantalla({ auth: { signInWithPassword: async () => { llamadas++; await espera; return { error: null }; } } });
  const primera = vista.enviar();
  const segunda = vista.enviar();
  assert.equal(llamadas, 1);
  resolver();
  await Promise.all([primera, segunda]);
});
