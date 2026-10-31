"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarNombre } from "@/app/account/actions";
import { createClient } from "@/lib/supabase/client";

const boton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold transition-[transform,box-shadow,background-color] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";
const campo =
  "mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm shadow-sm transition-shadow focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 disabled:bg-slate-100";
const tarjeta = "rounded-xl border border-slate-200 bg-white p-6 shadow-sm";

type PreferenciasPasaporte = {
  public_slug: string;
  passport_public: boolean;
  recruiter_history_shared: boolean;
};

type RespuestaPasaporte = {
  error?: string;
  passport?: {
    public_slug: string | null;
    passport_public: boolean;
    recruiter_history_shared: boolean;
  };
};

type PerfilCuentaProps = {
  nombreInicial: string;
  correo: string;
  confirmado: boolean;
  rol: string;
};

export default function PerfilCuenta({
  nombreInicial,
  correo,
  confirmado,
  rol,
}: PerfilCuentaProps) {
  const router = useRouter();
  const [nombreGuardado, setNombreGuardado] = useState(nombreInicial);
  const [nombre, setNombre] = useState(nombreInicial);
  const [seccion, setSeccion] = useState("perfil");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [privacidad, setPrivacidad] = useState<PreferenciasPasaporte>({
    public_slug: "",
    passport_public: false,
    recruiter_history_shared: false,
  });
  const [privacidadCargada, setPrivacidadCargada] = useState(false);
  const pendiente = useRef(false);

  const slug = privacidad.public_slug.trim().toLowerCase();
  const slugValido =
    slug.length >= 3 &&
    slug.length <= 30 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

  async function cargarPrivacidad() {
    if (pendiente.current) return;

    pendiente.current = true;
    setOcupado("cargar-privacidad");
    setSeccion("privacidad");
    setPrivacidadCargada(false);
    setError("");
    setMensaje("");

    try {
      const response = await fetch("/api/passport/me", {
        cache: "no-store",
      });
      const resultado = (await response.json()) as RespuestaPasaporte;

      if (!response.ok || !resultado.passport) {
        setError(resultado.error || "No pudimos cargar tu configuración.");
        return;
      }

      setPrivacidad({
        public_slug: resultado.passport.public_slug ?? "",
        passport_public: resultado.passport.passport_public,
        recruiter_history_shared:
          resultado.passport.recruiter_history_shared,
      });
      setPrivacidadCargada(true);
    } catch {
      setError("No pudimos conectar. Intenta cargar la configuración otra vez.");
    } finally {
      pendiente.current = false;
      setOcupado(null);
    }
  }

  async function ejecutar(accion: string) {
    if (pendiente.current) return;

    pendiente.current = true;
    setOcupado(accion);
    setError("");
    setMensaje("");

    try {
      if (accion === "guardar") {
        const resultado = await guardarNombre(nombre);

        if (resultado.error) {
          setError(resultado.error);
        } else if (resultado.nombre !== undefined) {
          setNombreGuardado(resultado.nombre);
          setNombre(resultado.nombre);
          setMensaje("Información actualizada correctamente.");
          router.refresh();
        }
      } else if (accion === "privacidad") {
        const response = await fetch("/api/passport/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_slug: privacidad.public_slug.trim() || null,
            passport_public: privacidad.passport_public,
            recruiter_history_shared:
              privacidad.recruiter_history_shared,
          }),
        });

        const resultado = (await response.json()) as RespuestaPasaporte;

        if (!response.ok || !resultado.passport) {
          setError(resultado.error || "No pudimos guardar tu configuración.");
        } else {
          setPrivacidad({
            public_slug: resultado.passport.public_slug ?? "",
            passport_public: resultado.passport.passport_public,
            recruiter_history_shared:
              resultado.passport.recruiter_history_shared,
          });
          setPrivacidadCargada(true);
          setMensaje("Preferencias de privacidad guardadas.");
        }
      } else if (accion === "salir") {
        const { error: errorSesion } = await createClient().auth.signOut({
          scope: "local",
        });

        if (errorSesion) {
          setError("No pudimos cerrar tu sesión. Vuelve a intentarlo.");
        } else {
          window.location.replace("/login");
        }
      } else {
        const retorno = new URL("/auth/callback", window.location.origin);
        retorno.searchParams.set("flujo", "recuperacion");

        const { error: errorRecuperacion } =
          await createClient().auth.resetPasswordForEmail(correo, {
            redirectTo: retorno.href,
          });

        if (errorRecuperacion) {
          setError("No pudimos enviar el enlace. Reintenta más tarde.");
        } else {
          setMensaje(
            "Solicitud recibida. Revisa tu correo para continuar con el cambio de contraseña."
          );
        }
      }
    } catch {
      setError(
        "No pudimos conectar. Vuelve a intentarlo; tus cambios siguen disponibles."
      );
    } finally {
      pendiente.current = false;
      setOcupado(null);
    }
  }

  const secciones = [
    ["perfil", "Perfil"],
    ["seguridad", "Seguridad"],
    ["privacidad", "Privacidad y pasaporte"],
  ];

  return (
    <>
      <nav
        aria-label="Secciones de cuenta"
        className="mt-8 flex flex-wrap gap-7 border-b border-slate-200 text-sm font-medium"
      >
        {secciones.map(([id, texto]) => (
          <button
            key={id}
            type="button"
            disabled={Boolean(ocupado)}
            aria-current={seccion === id ? "page" : undefined}
            onClick={() => {
              if (id === "privacidad") {
                void cargarPrivacidad();
              } else {
                setSeccion(id);
                setError("");
                setMensaje("");
              }
            }}
            className={`min-h-12 border-b-2 focus-visible:outline-2 focus-visible:outline-blue-700 ${
              seccion === id
                ? "border-blue-600 text-blue-700"
                : "border-transparent hover:text-blue-700"
            }`}
          >
            {texto}
          </button>
        ))}
      </nav>

      <div
        className="mt-8 max-w-[720px] space-y-6"
        aria-busy={Boolean(ocupado)}
      >
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {mensaje && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {mensaje}
          </p>
        )}

        {seccion === "perfil" && (
          <section className={tarjeta} aria-labelledby="datos-personales">
            <h2 id="datos-personales" className="text-xl font-semibold">
              Datos personales
            </h2>

            <form
              className="mt-5 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void ejecutar("guardar");
              }}
            >
              <div>
                <label
                  htmlFor="nombre-cuenta"
                  className="text-sm font-semibold"
                >
                  Nombre completo
                </label>
                <input
                  id="nombre-cuenta"
                  autoComplete="name"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  required
                  maxLength={120}
                  disabled={Boolean(ocupado)}
                  className={campo}
                  aria-describedby="ayuda-nombre"
                />
                <p id="ayuda-nombre" className="mt-2 text-xs text-slate-500">
                  Este es el nombre que se muestra en tu perfil.
                </p>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="correo-cuenta"
                    className="text-sm font-semibold"
                  >
                    Correo electrónico
                  </label>
                  {confirmado && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
                      ✓ Correo confirmado
                    </span>
                  )}
                </div>
                <input
                  id="correo-cuenta"
                  readOnly
                  value={correo || "Correo no disponible"}
                  className={`${campo} bg-[#eff3ff] text-slate-600`}
                  aria-describedby="ayuda-correo"
                />
                <p id="ayuda-correo" className="mt-2 text-xs text-slate-500">
                  El correo de acceso no se modifica desde esta pantalla.
                </p>
              </div>

              <div>
                <label htmlFor="rol-cuenta" className="text-sm font-semibold">
                  Rol
                </label>
                <input
                  id="rol-cuenta"
                  readOnly
                  value={rol}
                  className={`${campo} bg-[#eff3ff] text-slate-600`}
                  aria-describedby="ayuda-rol"
                />
                <p id="ayuda-rol" className="mt-2 text-xs text-slate-500">
                  Tu rol es administrado por el responsable de la plataforma.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={Boolean(ocupado)}
                  className={`${boton} border-slate-200 bg-white`}
                  onClick={() => {
                    setNombre(nombreGuardado);
                    setError("");
                    setMensaje("");
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    Boolean(ocupado) ||
                    nombre.trim() === nombreGuardado ||
                    !nombre.trim()
                  }
                  className={`${boton} border-transparent bg-[#165dcc] text-white hover:bg-blue-800`}
                >
                  {ocupado === "guardar" && <Spinner />}
                  {ocupado === "guardar" ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        )}

        {seccion === "seguridad" && (
          <section className={tarjeta}>
            <h2 className="text-xl font-semibold">Contraseña</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Solicita un enlace en tu correo de acceso para establecer una
              nueva contraseña.
            </p>
            <button
              type="button"
              disabled={Boolean(ocupado) || !correo}
              onClick={() => void ejecutar("recuperar")}
              className={`${boton} mt-5 border-blue-600 text-blue-700`}
            >
              {ocupado === "recuperar" && <Spinner />}
              {ocupado === "recuperar"
                ? "Enviando…"
                : "Enviar enlace de cambio"}
            </button>
          </section>
        )}

        {seccion === "privacidad" && (
          <section className={tarjeta}>
            <h2 className="text-xl font-semibold">Privacidad y pasaporte</h2>

            {ocupado === "cargar-privacidad" ? (
              <p role="status" className="mt-4 text-sm text-slate-600">
                Cargando configuración…
              </p>
            ) : !privacidadCargada ? (
              <button
                type="button"
                onClick={() => void cargarPrivacidad()}
                className={`${boton} mt-5 border-blue-600 text-blue-700`}
              >
                Reintentar carga
              </button>
            ) : (
              <form
                className="mt-5 space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void ejecutar("privacidad");
                }}
              >
                <div>
                  <label
                    htmlFor="slug-pasaporte"
                    className="text-sm font-semibold"
                  >
                    Enlace personalizado
                  </label>
                  <div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-white px-4">
                    <span className="text-sm text-slate-500">/passport/</span>
                    <input
                      id="slug-pasaporte"
                      value={privacidad.public_slug}
                      onChange={(event) =>
                        setPrivacidad((actual) => ({
                          ...actual,
                          public_slug: event.target.value.toLowerCase(),
                        }))
                      }
                      minLength={3}
                      maxLength={30}
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      placeholder="tu-nombre"
                      disabled={Boolean(ocupado)}
                      className="min-h-12 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    De 3 a 30 letras minúsculas, números o guiones; debe estar
                    disponible.
                  </p>
                </div>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={privacidad.passport_public}
                    onChange={(event) =>
                      setPrivacidad((actual) => ({
                        ...actual,
                        passport_public: event.target.checked,
                      }))
                    }
                    disabled={Boolean(ocupado)}
                    className="mt-1 size-4 accent-blue-700"
                  />
                  <span className="text-sm">
                    <strong className="block">Publicar mi pasaporte</strong>
                    <span className="mt-1 block text-slate-600">
                      Permite consultar tu nombre y resultados publicados. No
                      muestra tu correo, repositorio ni notas internas.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={privacidad.recruiter_history_shared}
                    onChange={(event) =>
                      setPrivacidad((actual) => ({
                        ...actual,
                        recruiter_history_shared: event.target.checked,
                      }))
                    }
                    disabled={Boolean(ocupado)}
                    className="mt-1 size-4 accent-blue-700"
                  />
                  <span className="text-sm">
                    <strong className="block">
                      Compartir mi historial con reclutadores
                    </strong>
                    <span className="mt-1 block text-slate-600">
                      Autoriza la consulta de tus evaluaciones de entrevista
                      finalizadas. Es independiente de publicar el pasaporte.
                    </span>
                  </span>
                </label>

                <div className="flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 pt-4">
                  {privacidad.passport_public && slugValido && (
                    <Link
                      href={`/passport/${encodeURIComponent(slug)}`}
                      className="text-sm text-blue-700 underline"
                    >
                      Ver pasaporte
                    </Link>
                  )}
                  <button
                    type="submit"
                    disabled={
                      Boolean(ocupado) ||
                      (privacidad.passport_public && !slugValido)
                    }
                    className={`${boton} border-transparent bg-[#165dcc] text-white hover:bg-blue-800`}
                  >
                    {ocupado === "privacidad" && <Spinner />}
                    {ocupado === "privacidad"
                      ? "Guardando…"
                      : "Guardar preferencias"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className={tarjeta}>
          <h2 className="text-xl font-semibold">Sesión</h2>
          <p className="mt-2 text-sm text-slate-600">
            Cierra tu sesión en este dispositivo.
          </p>
          <button
            type="button"
            disabled={Boolean(ocupado)}
            onClick={() => void ejecutar("salir")}
            className={`${boton} mt-5 border-blue-600 text-blue-700`}
          >
            {ocupado === "salir" ? (
              <Spinner />
            ) : (
              <span aria-hidden="true">↪</span>
            )}
            {ocupado === "salir" ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </section>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
    />
  );
}