import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function enlace({ reducido = false, existe = true, hash = "" } = {}) {
  const desplazamientos = [];
  const historial = [];
  const atributos = new Map();
  const eventos = new Map();
  const temporizadores = new Map();
  let siguienteTimer = 0;
  const landing = { setAttribute: (clave, valor) => atributos.set(clave, valor), removeAttribute: clave => atributos.delete(clave) };
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(readFileSync(new URL("../src/components/landing/section-link.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "module", "exports", "window", "document", codigo)(require, modulo, modulo.exports, {
    scrollY: 100,
    getComputedStyle: () => ({ scrollMarginTop: "96px" }),
    scrollTo: valor => desplazamientos.push(valor),
    matchMedia: () => ({ matches: reducido }),
    location: { hash },
    history: { pushState: (...valores) => historial.push(valores) },
    setTimeout: callback => { temporizadores.set(++siguienteTimer, callback); return siguienteTimer; },
    clearTimeout: id => temporizadores.delete(id),
    addEventListener: (nombre, callback) => eventos.set(nombre, callback),
    removeEventListener: nombre => eventos.delete(nombre),
  }, { getElementById: id => { assert.equal(id, "equipo"); return existe ? { getBoundingClientRect: () => ({ top: 600 }), closest: () => landing } : null; } });
  const nodo = modulo.exports.default({ href: "#equipo", children: "Equipo" });
  const evento = { button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  return { click: nodo.props.onClick, evento, desplazamientos, historial, atributos, eventos, temporizadores };
}

test("Las anclas solicitan deslizamiento nativo con margen de la cabecera y conservan el hash", () => {
  const vista = enlace();
  vista.click(vista.evento);
  assert.equal(vista.evento.defaultPrevented, true);
  assert.deepEqual(vista.desplazamientos, [{ top: 604, behavior: "smooth" }]);
  assert.deepEqual(vista.historial, [[null, "", "#equipo"]]);
});

test("Movimiento reducido evita la animación y repetir la sección no duplica el historial", () => {
  const vista = enlace({ reducido: true, hash: "#equipo" });
  vista.click(vista.evento);
  assert.equal(vista.desplazamientos[0].behavior, "instant");
  assert.deepEqual(vista.historial, []);
  assert.equal(vista.atributos.has("data-deslizando"), false);
});

test("El blur desaparece al terminar el scroll y libera eventos y temporizadores", () => {
  const vista = enlace();
  vista.click(vista.evento);
  assert.equal(vista.atributos.get("data-deslizando"), "true");
  vista.eventos.get("scroll")();
  vista.eventos.get("scrollend")();
  assert.equal(vista.atributos.has("data-deslizando"), false);
  assert.equal(vista.eventos.size, 0);
  assert.equal(vista.temporizadores.size, 0);
});

test("Sin scrollend, el blur se limpia por inactividad o por el límite de seguridad", () => {
  for (const emitirScroll of [true, false]) {
    const vista = enlace();
    vista.click(vista.evento);
    if (emitirScroll) vista.eventos.get("scroll")();
    [...vista.temporizadores.values()].at(-1)();
    assert.equal(vista.atributos.has("data-deslizando"), false);
    assert.equal(vista.eventos.size, 0);
  }
});

test("Se respeta abrir en otra pestaña y la navegación nativa si falta el destino", () => {
  for (const modificador of ["ctrlKey", "metaKey", "shiftKey", "altKey"]) {
    const vista = enlace();
    vista.click({ ...vista.evento, [modificador]: true });
    assert.deepEqual(vista.desplazamientos, []);
  }
  const vista = enlace({ existe: false });
  vista.click(vista.evento);
  assert.equal(vista.evento.defaultPrevented, false);
  assert.deepEqual(vista.desplazamientos, []);
});
