import { NextResponse } from "next/server";
export function reply(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
export function defenseError(error: { code?: string }) {
  const code = error.code;
  if (["PGRST202", "PGRST205", "42P01", "42883"].includes(code || "")) return reply({ error: "La defensa técnica aún no está habilitada en el servidor. Falta aplicar la migración del módulo.", unavailable: true }, 503);
  if (code === "42501") return reply({ error: "No tienes acceso a esta defensa." }, 403);
  if (code === "P0002") return reply({ error: "La entrega o el desafío no están disponibles." }, 404);
  if (code === "40001") return reply({ error: "El estado cambió en otra solicitud. Recarga antes de continuar." }, 409);
  if (["22023", "22P02"].includes(code || "")) return reply({ error: "Revisa los datos y la configuración de la defensa." }, 400);
  if (code === "55000") return reply({ error: "La defensa no está habilitada para este desafío." }, 409);
  return reply({ error: "No pudimos confirmar la operación. Revisa el estado antes de reintentar." }, 500);
}
