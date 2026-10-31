"use client";


import { LoadingState } from "@/components/ui/loading-state";
import { FormEvent, Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient, guardarPreferenciaSesion } from "@/lib/supabase/client";

function esErrorTemporal(error: unknown) {
  return isAuthRetryableFetchError(error) || error instanceof TypeError ||
    (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"));
}

function mensajeAutenticacion(error: unknown) {
  if (esErrorTemporal(error)) {
    return "No pudimos completar la acción. Reintenta; tus datos siguen disponibles.";
  }
  if (isAuthError(error)) {
    switch (error.code) {
      case "invalid_credentials": return "Correo o contraseña incorrectos.";
      case "email_not_confirmed": return "Confirma tu correo antes de iniciar sesión.";
      case "weak_password": return "La contraseña no cumple los requisitos. Usa una contraseña más segura.";
      case "same_password": return "La nueva contraseña debe ser diferente a la anterior.";
      case "over_email_send_rate_limit":
      case "over_request_rate_limit": return "Has realizado demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
      case "signup_disabled": return "La creación de cuentas no está disponible por el momento.";
      case "session_not_found":
      case "refresh_token_not_found":
      case "refresh_token_already_used": return "El enlace o la sesión caducaron. Solicita un nuevo enlace.";
      default: return "No pudimos completar la acción. Comprueba tus datos y vuelve a intentarlo.";
    }
  }
  return "No pudimos completar la acción. Vuelve a intentarlo.";
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState fullPage label="Cargando acceso…"/>}>
      <FormularioAcceso />
    </Suspense>
  );
}

function FormularioAcceso() {
  const router = useRouter();
  const parametros = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup" | "recuperar" | "restablecer">(
    parametros.get("estado") === "restablecer" ? "restablecer" : parametros.get("mode") === "register" ? "signup" : "login"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(parametros.has("error")
    ? "No pudimos validar el enlace. Puede haber caducado o haber sido utilizado. Vuelve a iniciar sesión o solicita otro enlace."
    : "");
  const [loading, setLoading] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [recordarme, setRecordarme] = useState(false);
  const [confirmacion, setConfirmacion] = useState<"registro" | "recuperacion" | null>(null);
  const [operacionOAuth, setOperacionOAuth] = useState<"google" | "github" | null>(null);
  const [errorRecuperable, setErrorRecuperable] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);
  const enviando = useRef(false);
  const ultimoProveedor = useRef<"google" | "github" | null>(null);
  const [erroresCampos, setErroresCampos] = useState({
    nombre: false,
    correo: false,
    contrasena: false,
  });

  const correoEnviado = confirmacion !== null;
  const cuentaCreada = mensajeExito;
  const credencialesIncorrectas = mode === "login" && message === "Correo o contraseña incorrectos.";

  function mostrarError(error: unknown) {
    setMessage(mensajeAutenticacion(error));
    setMensajeExito(false);
    setErrorRecuperable(esErrorTemporal(error));
  }

  function volverAlLogin() {
    setMessage("");
    setMensajeExito(false);
    setErrorRecuperable(false);
    setConfirmacion(null);
    setMode("login");
    setPassword("");
    setMostrarContrasena(false);
    setErroresCampos({ nombre: false, correo: false, contrasena: false });
    router.replace("/login");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando.current) return;
    enviando.current = true;
    ultimoProveedor.current = null;
    setMessage("");
    setMensajeExito(false);
    setErrorRecuperable(false);
    setLoading(true);

    try {
      if (mode === "restablecer") {
        const { data: usuario, error: errorUsuario } = await supabase.auth.getUser();
        if (errorUsuario || !usuario.user) {
          setMessage("El enlace caducó o no es válido. Solicita un nuevo enlace para recuperar tu contraseña.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        const { error: errorSalida } = await supabase.auth.signOut({ scope: "global" }).catch(() => ({ error: true }));
        volverAlLogin();
        setMensajeExito(true);
        setMessage(errorSalida
          ? "Contraseña actualizada. No pudimos cerrar todas las sesiones; vuelve a iniciar sesión para continuar."
          : "Contraseña actualizada. Ya puedes iniciar sesión.");
        return;
      }

      guardarPreferenciaSesion(mode === "login" && recordarme);
      const retorno = new URL("/auth/callback", window.location.origin);

      if (mode === "recuperar") {
        retorno.searchParams.set("flujo", "recuperacion");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: retorno.href });
        if (error && error.code !== "user_not_found") throw error;
        setConfirmacion("recuperacion");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: retorno.href,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setConfirmacion("registro");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      mostrarError(error);
    } finally {
      setLoading(false);
      enviando.current = false;
    }
  }

  async function iniciarOAuth(proveedor: "google" | "github") {
    if (enviando.current) return;
    enviando.current = true;
    setLoading(true);
    setOperacionOAuth(proveedor);
    ultimoProveedor.current = proveedor;
    setMessage("");
    setMensajeExito(false);
    setErrorRecuperable(false);
    let redirigiendo = false;

    try {
      const respuesta = await fetch(new URL("/auth/v1/settings", process.env.NEXT_PUBLIC_SUPABASE_URL!), {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!respuesta.ok) throw new TypeError("No se pudo consultar el servicio de acceso.");
      const configuracion = await respuesta.json();
      if (configuracion.external?.[proveedor] !== true) {
        setMessage(`El acceso con ${proveedor === "google" ? "Google" : "GitHub"} no está disponible por el momento. Puedes usar correo y contraseña.`);
        return;
      }

      guardarPreferenciaSesion(mode === "login" && recordarme);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: proveedor,
        options: {
          redirectTo: new URL("/auth/callback", window.location.origin).href,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error("No se recibió una dirección de acceso.");
      window.location.assign(data.url);
      redirigiendo = true;
    } catch (error) {
      mostrarError(error);
    } finally {
      if (!redirigiendo) {
        setLoading(false);
        setOperacionOAuth(null);
        enviando.current = false;
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--login-background)] text-gray-900 [--login-background:#f8f9ff] [--login-primary:#195bd7] [--login-muted:#597096] [--login-tabs-background:#e6edff]">
      <header className="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-7">
        <span className="text-sm font-semibold">SKILLPROOF</span>
      </header>

      <main className={`flex flex-1 justify-center px-6 pt-6 pb-12 ${correoEnviado || mode === "recuperar" || mode === "restablecer" ? "items-center" : "items-start"}`}>
        {correoEnviado ? (
          <section aria-labelledby="titulo-confirmacion" role="status" className="w-full max-w-[364px] rounded-[10px] bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--login-tabs-background)] text-blue-700">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="1" />
                <path d="m3 6 9 7 9-7" />
              </svg>
            </div>
            <h1 id="titulo-confirmacion" className="mt-5 text-base font-bold">Revisa tu correo</h1>
            <p className="mt-2 text-xs leading-[18px] text-[var(--login-muted)]">
              {confirmacion === "recuperacion"
                ? "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
                : <>Te enviamos un enlace de confirmación a <span className="break-all">{email}</span>. Ábrelo para activar tu cuenta.</>}
            </p>
            <button
              type="button"
              onClick={volverAlLogin}
              className="mt-5 h-[37px] w-full cursor-pointer rounded-md border border-gray-200 bg-white text-xs transition-[transform,scale,box-shadow,filter] duration-150 hover:shadow-sm motion-safe:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Volver a iniciar sesión
            </button>
          </section>
        ) : (
          <section aria-labelledby="titulo-login" aria-busy={loading} className="w-full max-w-[364px] rounded-[10px] bg-white p-6 shadow-sm">
            <h1 id="titulo-login" className="text-2xl leading-[29px] font-bold tracking-tight">
              {mode === "signup" ? "Crea tu cuenta" : mode === "recuperar" ? "Recupera tu contraseña" : mode === "restablecer" ? "Crea una nueva contraseña" : "Inicia sesión"}
            </h1>
            <p className="mt-0.5 text-[13px] leading-4 text-[var(--login-muted)]">
              {mode === "signup" ? "Regístrate como estudiante para comenzar tu desafío." : mode === "recuperar" ? "Ingresa tu correo y te enviaremos un enlace para crear una nueva." : mode === "restablecer" ? "Elige una contraseña nueva de al menos 8 caracteres." : "Accede para ver tu desafío y tu entrega."}
            </p>

            {(mode === "login" || mode === "signup") && (
            <div role="group" aria-label="Acceso a tu cuenta" className="mt-[18px] flex h-10 rounded-md bg-[var(--login-tabs-background)] p-[3px] text-[11px]">
              <button
                type="button"
                aria-pressed={mode === "login"}
                disabled={loading}
                onClick={() => {
                  setMessage("");
                  setMode("login");
                  setErroresCampos({ nombre: false, correo: false, contrasena: false });
                }}
                className={`flex-1 rounded-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-[transform,scale,box-shadow,filter] duration-150 enabled:hover:brightness-95 motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${mode === "login" ? "bg-[var(--login-primary)] font-semibold text-white" : "text-gray-900"}`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                aria-pressed={mode === "signup"}
                disabled={loading}
                onClick={() => {
                  setMessage("");
                  setMode("signup");
                  setErroresCampos({ nombre: false, correo: false, contrasena: false });
                }}
                className={`flex-1 rounded-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-[transform,scale,box-shadow,filter] duration-150 enabled:hover:brightness-95 motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${mode === "signup" ? "bg-[var(--login-primary)] font-semibold text-white" : "text-gray-900"}`}
              >
                Crear cuenta
              </button>
            </div>
            )}

            {message && (
              <div
                id="mensaje-acceso"
                role={cuentaCreada ? "status" : "alert"}
                className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2.5 text-[11px] leading-4 ${cuentaCreada ? "border-gray-200 bg-gray-50 text-gray-700" : "border-red-200 bg-red-50 text-red-600"}`}
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-px shrink-0">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v6m0 3v1" />
                </svg>
                <span className="flex-1">{message}</span>
                {errorRecuperable && (
                  <button type="button" disabled={loading} onClick={() => ultimoProveedor.current ? iniciarOAuth(ultimoProveedor.current) : formulario.current?.requestSubmit()} className="shrink-0 cursor-pointer rounded border border-red-200 bg-white px-2 py-1 text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">
                    Reintentar
                  </button>
                )}
              </div>
            )}

            <form
              ref={formulario}
              onSubmit={handleSubmit}
              onInvalidCapture={(event) => {
                event.preventDefault();
                const campo = event.target;
                if (campo instanceof HTMLInputElement && campo.name in erroresCampos) {
                  setErroresCampos((anteriores) => ({ ...anteriores, [campo.name]: true }));
                  event.currentTarget.querySelector<HTMLInputElement>("input:invalid")?.focus();
                }
              }}
              onInputCapture={(event) => {
                const campo = event.target;
                if (campo instanceof HTMLInputElement && campo.name in erroresCampos) {
                  const nombreCampo = campo.name as keyof typeof erroresCampos;
                  if (erroresCampos[nombreCampo]) {
                    setErroresCampos((anteriores) => ({ ...anteriores, [nombreCampo]: !campo.validity.valid }));
                  }
                }
              }}
              className="mt-[18px]"
            >
              {mode === "signup" && (
                <label className="mb-3 block text-[11px] leading-4">
                  Nombre completo
                  <input
                    name="nombre"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={80}
                    disabled={loading}
                    autoComplete="name"
                    aria-invalid={erroresCampos.nombre}
                    aria-describedby={erroresCampos.nombre ? "error-nombre" : undefined}
                    className="mt-0.5 h-11 w-full rounded-lg border border-gray-200 bg-white shadow-md shadow-black/10 enabled:hover:border-gray-300 focus-visible:shadow-lg transition-shadow duration-150 motion-reduce:transition-none px-3 text-[13px] outline-none focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-100 aria-invalid:border-red-400 aria-invalid:focus-visible:border-red-400 aria-invalid:focus-visible:ring-red-100 disabled:opacity-60"
                  />
                  {erroresCampos.nombre && (
                    <span id="error-nombre" className="mt-1 flex items-center gap-1 text-[11px] leading-4 text-red-600"><span aria-hidden="true">ⓘ</span> Ingresa tu nombre.</span>
                  )}
                </label>
              )}

              {mode !== "restablecer" && (
              <label className="block text-[11px] leading-4">
                Correo electrónico
                <input
                  name="correo"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nombre@ejemplo.com"
                  disabled={loading}
                  aria-invalid={erroresCampos.correo}
                  aria-describedby={erroresCampos.correo ? "error-correo" : undefined}
                  className="mt-0.5 h-11 w-full rounded-lg border border-gray-200 bg-white shadow-md shadow-black/10 enabled:hover:border-gray-300 focus-visible:shadow-lg transition-shadow duration-150 motion-reduce:transition-none px-3 text-[13px] placeholder:text-gray-400 outline-none focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-100 aria-invalid:border-red-400 aria-invalid:focus-visible:border-red-400 aria-invalid:focus-visible:ring-red-100 disabled:opacity-60"
                />
                {erroresCampos.correo && (
                  <span id="error-correo" className="mt-1 flex items-center gap-1 text-[11px] leading-4 text-red-600"><span aria-hidden="true">ⓘ</span> Ingresa un correo válido.</span>
                )}
              </label>
              )}

              {mode !== "recuperar" && (
              <>
              <label htmlFor="contrasena" className={`${mode === "restablecer" ? "" : "mt-3 "}block text-[11px] leading-4`}>
                {mode === "restablecer" ? "Nueva contraseña" : "Contraseña"}
              </label>
              <div className="relative mt-0.5">
                <input
                  id="contrasena"
                  name="contrasena"
                  type={mostrarContrasena ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signup" || mode === "restablecer" ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  disabled={loading}
                  aria-invalid={erroresCampos.contrasena || credencialesIncorrectas}
                  aria-describedby={erroresCampos.contrasena ? "error-contrasena" : credencialesIncorrectas ? "mensaje-acceso" : undefined}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white shadow-md shadow-black/10 enabled:hover:border-gray-300 focus-visible:shadow-lg transition-shadow duration-150 motion-reduce:transition-none py-2 pr-11 pl-3 text-[13px] placeholder:text-gray-400 outline-none focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-100 aria-invalid:border-red-400 aria-invalid:focus-visible:border-red-400 aria-invalid:focus-visible:ring-red-100 disabled:opacity-60"
                />
                <button
                  type="button"
                  aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={mostrarContrasena}
                  aria-controls="contrasena"
                  disabled={loading}
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-md text-[var(--login-muted)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-[transform,scale,box-shadow,filter] duration-150 enabled:hover:brightness-95 motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                    {mostrarContrasena && <path d="m3 3 18 18" />}
                  </svg>
                </button>
              </div>
              {erroresCampos.contrasena && (
                <p id="error-contrasena" className="mt-1 flex items-center gap-1 text-[11px] leading-4 text-red-600"><span aria-hidden="true">ⓘ</span> La contraseña no cumple los requisitos.</p>
              )}
              </>
              )}

              {mode === "login" && (
                <div className="mt-5 flex min-h-4 flex-wrap items-center justify-between gap-2 text-[11px] leading-4">
                  <label title="Mantener el acceso en este navegador" className="flex cursor-pointer items-center gap-1.5">
                    <input type="checkbox" checked={recordarme} onChange={(event) => setRecordarme(event.target.checked)} disabled={loading} aria-describedby="ayuda-recordarme" className="size-[15px] rounded-sm accent-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60" />
                    Recordarme
                  </label>
                  <button type="button" disabled={loading} onClick={() => {
                    setMode("recuperar");
                    setPassword("");
                    setMessage("");
                    setMensajeExito(false);
                    setErrorRecuperable(false);
                    setErroresCampos({ nombre: false, correo: false, contrasena: false });
                  }} className="cursor-pointer rounded-sm text-blue-700 transition-[transform,scale] duration-150 motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex h-[37px] w-full items-center justify-center gap-2 rounded-md bg-[var(--login-primary)] px-4 text-xs font-semibold text-white cursor-pointer transition-[transform,scale,box-shadow,filter] duration-150 enabled:hover:brightness-95 motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />}
                <span role="status" aria-live="polite">
                  {loading
                    ? operacionOAuth
                      ? "Conectando..."
                      : mode === "recuperar"
                      ? "Enviando enlace..."
                      : mode === "restablecer"
                      ? "Guardando contraseña..."
                      : mode === "signup"
                      ? "Creando cuenta..."
                      : "Iniciando sesión..."
                    : mode === "recuperar"
                      ? "Enviar enlace"
                      : mode === "restablecer"
                      ? "Guardar contraseña"
                      : mode === "signup"
                      ? "Crear cuenta"
                      : "Iniciar sesión"}
                </span>
              </button>
            </form>

            {(mode === "recuperar" || mode === "restablecer") && (
              <button type="button" disabled={loading} onClick={volverAlLogin} className="mx-auto mt-[18px] block cursor-pointer rounded-sm text-[11px] text-blue-700 transition-[transform,scale] duration-150 motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">
                ← Volver a iniciar sesión
              </button>
            )}

            {(mode === "login" || mode === "signup") && (
            <>
            <div className="mt-[18px] flex items-center gap-3 text-[11px] leading-4 text-[var(--login-muted)]">
              <span aria-hidden="true" className="h-px flex-1 bg-[var(--login-tabs-background)]" />
              <span>{mode === "signup" ? "o regístrate con" : "o continúa con"}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-[var(--login-tabs-background)]" />
            </div>

            <div className="mt-[18px] space-y-2.5">
              <button type="button" disabled={loading} onClick={() => iniciarOAuth("google")} className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-white text-xs text-gray-900 shadow-sm transition-[transform,scale,box-shadow] duration-150 enabled:hover:shadow-md motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {operacionOAuth === "google" ? <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-gray-200 border-t-blue-700 motion-safe:animate-spin" /> : (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
                  <path fill="#34a853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
                  <path fill="#fbbc05" d="M6.41 13.93a6 6 0 0 1 0-3.86V7.48H3.07a10 10 0 0 0 0 9.04l3.34-2.59Z" />
                  <path fill="#ea4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z" />
                </svg>
                )}
                {operacionOAuth === "google" ? "Conectando..." : mode === "signup" ? "Registrarse con Google" : "Continuar con Google"}
              </button>
              <button type="button" disabled={loading} onClick={() => iniciarOAuth("github")} className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-white text-xs text-gray-900 shadow-sm transition-[transform,scale,box-shadow] duration-150 enabled:hover:shadow-md motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {operacionOAuth === "github" ? <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-gray-200 border-t-blue-700 motion-safe:animate-spin" /> : (
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.62 1.22 3.26.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.55 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.31 3.08 1.15a10.68 10.68 0 0 1 5.6 0c2.14-1.46 3.08-1.15 3.08-1.15.61 1.55.23 2.69.11 2.98.73.79 1.16 1.79 1.16 3.02 0 4.31-2.63 5.26-5.14 5.54.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" />
                </svg>
                )}
                {operacionOAuth === "github" ? "Conectando..." : mode === "signup" ? "Registrarse con GitHub" : "Continuar con GitHub"}
              </button>
            </div>

            <p className="mt-[18px] text-center text-[11px] leading-4 text-[var(--login-muted)]">
              {mode === "signup" ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMessage("");
                  setMode(mode === "signup" ? "login" : "signup");
                  setErroresCampos({ nombre: false, correo: false, contrasena: false });
                }}
                className="rounded-sm text-blue-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-[transform,scale,box-shadow,filter] duration-150 enabled:hover:brightness-95 motion-safe:enabled:active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                {mode === "signup"
                  ? "Iniciar sesión"
                  : "Crear cuenta"}
              </button>
            </p>
            </>
            )}
          </section>
        )}
      </main>

      <p id="opciones-no-disponibles" className="sr-only">
        Términos y Soporte aún no están disponibles.
      </p>
      <p id="ayuda-recordarme" className="sr-only">
        Marcado: conserva el acceso hasta 30 días desde la última renovación. Desmarcado: usa cookies de sesión; el navegador puede conservarlas si restaura ventanas anteriores.
      </p>

      <footer className="flex min-h-[82px] shrink-0 flex-wrap items-start justify-between gap-3 border-t border-gray-300 bg-white px-7 py-[18px] text-[11px] leading-4 text-[var(--login-muted)]">
        <span>© {2026} SKILLPROOF</span>
        <div className="flex items-center gap-1.5">
          <button type="button" disabled aria-describedby="opciones-no-disponibles" title="Términos no está disponible todavía" className="cursor-not-allowed">Términos</button>
          <span aria-hidden="true">·</span>
          <button type="button" disabled aria-describedby="opciones-no-disponibles" title="Soporte no está disponible todavía" className="cursor-not-allowed">Soporte</button>
        </div>
      </footer>
    </div>
  );
}
