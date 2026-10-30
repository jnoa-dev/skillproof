import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", userId)
    .maybeSingle();

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, slug, title, description, difficulty")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let submission: { status: string } | null = null;

  if (challenge) {
    const { data: latestSubmission } = await supabase
      .from("submissions")
      .select("status")
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    submission = latestSubmission;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <header>
          <p className="text-sm font-medium text-blue-700">SkillProof</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Hola, {profile?.display_name || "Estudiante"}
          </h1>
          <p className="mt-2 text-gray-600">
            Aquí puedes ver tu desafío y el estado de tu entrega.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Tu desafío</h2>

          {challengeError && (
            <p className="mt-4 text-sm text-red-700">
              No se pudo cargar el desafío. Revisa la configuración de Supabase.
            </p>
          )}

          {!challengeError && !challenge && (
            <p className="mt-4 text-gray-600">
              Todavía no hay desafíos activos.
            </p>
          )}

          {challenge && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {challenge.title}
                </h3>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800">
                  {challenge.difficulty}
                </span>
              </div>

              <p className="mt-3 text-gray-700">{challenge.description}</p>

              <p className="mt-4 text-sm text-gray-600">
                Estado:{" "}
                <span className="font-semibold text-gray-900">
                  {submission?.status === "submitted"
                    ? "Entregado"
                    : submission?.status === "draft"
                      ? "Borrador"
                      : "Pendiente"}
                </span>
              </p>

              <Link
                href={`/challenges/${challenge.slug}`}
                className="mt-6 inline-block rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white"
              >
                Ver desafío
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}