import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function accion({ usuario = { id: "usuario-autenticado" }, resultado = { data: { display_name: "Nombre nuevo" }, error: null }, desconectado = false } = {}) {
  const llamadas = [];
  const cliente = {
    auth: { getUser: async () => ({ data: { user: usuario }, error: null }) },
    from: tabla => {
      llamadas.push(["tabla", tabla]);
      return { update: valores => {
        llamadas.push(["update", valores]);
        return { eq: (campo, valor) => {
          llamadas.push(["eq", campo, valor]);
          return { select: columnas => {
            llamadas.push(["select", columnas]);
            return { maybeSingle: async () => resultado };
          } };
        } };
      } };
    },
  };
  const codigo = ts.transpileModule(readFileSync(new URL("../src/app/account/actions.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const modulo = { exports: {} };
  new Function("require", "module", "exports", codigo)(nombre => {
    assert.equal(nombre, "@/lib/supabase/server");
    return { createClient: async () => { if (desconectado) throw new Error("sin red"); return cliente; } };
  }, modulo, modulo.exports);
  return { guardar: modulo.exports.guardarNombre, llamadas };
}

test("El guardado solo modifica display_name del usuario autenticado", async () => {
  const { guardar, llamadas } = accion();
  assert.deepEqual(await guardar("  Nombre nuevo  "), { nombre: "Nombre nuevo" });
  assert.deepEqual(llamadas, [["tabla", "profiles"], ["update", { display_name: "Nombre nuevo" }], ["eq", "id", "usuario-autenticado"], ["select", "display_name"]]);
});

test("Sin usuario autenticado no se intenta escribir", async () => {
  const { guardar, llamadas } = accion({ usuario: null });
  assert.ok((await guardar("Nombre nuevo")).error);
  assert.deepEqual(llamadas, []);
});

test("Los datos inválidos se rechazan antes de escribir", async () => {
  const { guardar, llamadas } = accion();
  for (const valor of ["", "   ", "x".repeat(121), "Nombre\u0000", null, { role: "admin" }]) assert.ok((await guardar(valor)).error);
  assert.deepEqual(llamadas, []);
});

test("Permisos denegados, cero filas y errores de red nunca simulan éxito", async () => {
  for (const resultado of [{ data: null, error: { message: "RLS" } }, { data: null, error: null }, { data: { display_name: "Nombre anterior" }, error: null }]) {
    assert.ok((await accion({ resultado }).guardar("Nombre nuevo")).error);
  }
  assert.ok((await accion({ desconectado: true }).guardar("Nombre nuevo")).error);
});
