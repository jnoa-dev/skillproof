"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
        },
      });

      setLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        setMessage("Cuenta creada e iniciada. Revisa Supabase para confirmar el perfil.");
        router.refresh();
      } else {
        setMessage("Cuenta creada. Revisa tu correo para confirmar la dirección y luego inicia sesión.");
      }

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900">SkillProof</h1>
        <p className="mt-2 text-sm text-gray-600">
          {mode === "signup" ? "Crea tu cuenta de estudiante" : "Inicia sesión"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {mode === "signup" && (
            <label className="block text-sm font-medium text-gray-700">
              Nombre
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={80}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          )}

          <label className="block text-sm font-medium text-gray-700">
            Correo
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {loading
              ? "Procesando..."
              : mode === "signup"
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>
        </form>

        {message && (
          <p role="status" className="mt-4 text-sm text-gray-700">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setMode(mode === "signup" ? "login" : "signup");
          }}
          className="mt-6 text-sm font-medium text-blue-700 underline"
        >
          {mode === "signup"
            ? "Ya tengo una cuenta"
            : "Crear una cuenta de estudiante"}
        </button>
      </section>
    </main>
  );
}