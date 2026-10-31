import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentActionError } from "@/lib/auth/student";

function parseGithubRepo(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      (host !== "github.com" && host !== "www.github.com")
    ) {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length !== 2) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    const allowed = /^[A-Za-z0-9_.-]+$/;

    if (!allowed.test(owner) || !allowed.test(repo)) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    const parsed: unknown = await request.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const action = body.action;
  const challengeId =
    typeof body.challengeId === "string" ? body.challengeId : "";

  const repoUrl =
    typeof body.github_repo_url === "string"
      ? body.github_repo_url.trim()
      : "";
  const documentation =
    typeof body.documentation === "string" ? body.documentation.trim() : "";
  const justification =
    typeof body.justification === "string" ? body.justification.trim() : "";
  const problemDescription =
    typeof body.problem_description === "string"
      ? body.problem_description.trim()
      : "";

  if (action !== "draft" && action !== "submit") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  if (!/^[0-9a-f-]{36}$/i.test(challengeId)) {
    return NextResponse.json({ error: "Desafío inválido." }, { status: 400 });
  }

  if (
    repoUrl.length > 500 ||
    documentation.length > 20000 ||
    justification.length > 20000 ||
    problemDescription.length > 20000
  ) {
    return NextResponse.json(
      { error: "Uno de los campos supera el límite permitido." },
      { status: 413 }
    );
  }

  const parsedRepo = repoUrl ? parseGithubRepo(repoUrl) : null;

  if (repoUrl && !parsedRepo) {
    return NextResponse.json(
      { error: "Usa una URL válida de un repositorio de GitHub." },
      { status: 400 }
    );
  }

  if (
    action === "submit" &&
    (!parsedRepo ||
      !documentation ||
      !justification ||
      !problemDescription)
  ) {
    return NextResponse.json(
      {
        error:
          "Para enviar, completa todos los campos y agrega una URL de GitHub.",
      },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    return NextResponse.json(
      { error: "Inicia sesión para guardar una entrega." },
      { status: 401 }
    );
  }

  const roleError = await studentActionError(supabase, userId);
  if (roleError) return roleError;

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id")
    .eq("id", challengeId)
    .eq("is_active", true)
    .maybeSingle();

  if (challengeError) {
    return NextResponse.json(
      { error: "No se pudo comprobar el desafío." },
      { status: 500 }
    );
  }

  if (!challenge) {
    return NextResponse.json(
      { error: "El desafío no existe o está inactivo." },
      { status: 404 }
    );
  }

  let canonicalRepoUrl = repoUrl;

  if (action === "submit" && parsedRepo) {
    let githubResponse: Response;

    try {
      githubResponse = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(parsedRepo.owner)}/${encodeURIComponent(parsedRepo.repo)}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          cache: "no-store",
        }
      );
    } catch {
      return NextResponse.json(
        { error: "No se pudo contactar a GitHub. Intenta de nuevo." },
        { status: 502 }
      );
    }

    if (githubResponse.status === 404) {
      return NextResponse.json(
        { error: "No encontramos el repo; verifica que exista y sea público." },
        { status: 400 }
      );
    }

    if (githubResponse.status === 403) {
      return NextResponse.json(
        { error: "GitHub limitó temporalmente la verificación. Intenta luego." },
        { status: 503 }
      );
    }

    if (!githubResponse.ok) {
      return NextResponse.json(
        { error: "GitHub no pudo verificar el repositorio." },
        { status: 502 }
      );
    }

    const githubRepo: { private?: boolean; html_url?: string } =
      await githubResponse.json();

    if (githubRepo.private) {
      return NextResponse.json(
        { error: "El repositorio debe ser público." },
        { status: 400 }
      );
    }

    canonicalRepoUrl = githubRepo.html_url ?? repoUrl;
  }

  const { data: existing, error: existingError } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: "No se pudo consultar la entrega existente." },
      { status: 500 }
    );
  }

  if (existing?.status === "submitted") {
    return NextResponse.json(
      { error: "Esta entrega ya fue enviada y quedó cerrada." },
      { status: 409 }
    );
  }

  const fields = {
    github_repo_url: canonicalRepoUrl || null,
    documentation: documentation || null,
    justification: justification || null,
    problem_description: problemDescription || null,
  };

  let submissionId = existing?.id;

  if (submissionId) {
    const { error } = await supabase
      .from("submissions")
      .update(fields)
      .eq("id", submissionId);

    if (error) {
      return NextResponse.json(
        { error: "No se pudo actualizar el borrador." },
        { status: 500 }
      );
    }
  } else {
    const { data: created, error } = await supabase
      .from("submissions")
      .insert({
        ...fields,
        user_id: userId,
        challenge_id: challengeId,
      })
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: "No se pudo crear la entrega." },
        { status: 500 }
      );
    }

    submissionId = created.id;
  }

  if (action === "submit") {
    const { error } = await supabase
      .from("submissions")
      .update({ status: "submitted" })
      .eq("id", submissionId);

    if (error) {
      return NextResponse.json(
        { error: "No se pudo enviar la entrega. El borrador quedó guardado." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    id: submissionId,
    status: action === "submit" ? "submitted" : "draft",
  });
}