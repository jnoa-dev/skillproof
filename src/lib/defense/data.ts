import "server-only";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { questionsFrom, type DefenseData } from "./types";

export class DefenseAccessError extends Error {}
async function account(evaluator: boolean) {
  await connection();
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/login");
  const profile = await db.from("profiles").select("display_name, role").eq("id", userId).maybeSingle();
  if (profile.error || !profile.data) throw new DefenseAccessError("No pudimos verificar tu perfil.");
  if (!["student", "evaluator", "admin"].includes(profile.data.role))
    throw new DefenseAccessError("Tu cuenta no tiene un rol reconocido.");
  if (evaluator && !["evaluator", "admin"].includes(profile.data.role))
    throw new DefenseAccessError("Esta sección requiere rol de evaluador o administrador.");
  return { db, userId, profile: profile.data };
}
export async function loadDefense(slug: string, evaluator = false): Promise<DefenseData> {
  const { db, userId, profile } = await account(evaluator);
  const challenge = await db.from("challenges").select("id, title, description, requirements")
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  if (challenge.error) throw new DefenseAccessError("No pudimos cargar el desafío.");
  if (!challenge.data) notFound();
  let submission: DefenseData["submission"] = null;
  if (!evaluator) {
    const result = await db.from("submissions").select("id, status, github_repo_url, updated_at")
      .eq("user_id", userId).eq("challenge_id", challenge.data.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw new DefenseAccessError("No pudimos verificar tu entrega. Reintenta antes de continuar.");
    submission = result.data;
  }
  return { slug, name: profile.display_name || "Mi cuenta", role: profile.role,
    title: challenge.data.title, description: challenge.data.description,
    questions: questionsFrom(challenge.data.requirements ?? []), submission };
}
export async function loadDefenseReview(submissionId: string): Promise<DefenseData> {
  const { db, userId, profile } = await account(true);
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) notFound();
  // Una fila ausente puede estar oculta por RLS: nunca significa que la entrega esté libre.
  // Exigimos asignación visible antes de leer evidencia; se conserva el acceso de admin.
  const assignment = await db.from("evaluations").select("evaluator_id, status").eq("submission_id", submissionId).maybeSingle();
  if (assignment.error) throw new DefenseAccessError("No pudimos verificar la asignación.");
  if (!assignment.data || (assignment.data.evaluator_id !== userId && profile.role !== "admin"))
    throw new DefenseAccessError("No tienes una asignación visible que autorice revisar esta entrega.");
  const result = await db.from("submissions").select("id, status, challenge_id, github_repo_url, updated_at")
    .eq("id", submissionId).eq("status", "submitted").maybeSingle();
  if (result.error) throw new DefenseAccessError("No pudimos cargar la entrega.");
  if (!result.data) notFound();
  const challenge = await db.from("challenges").select("slug, title, description, requirements")
    .eq("id", result.data.challenge_id).maybeSingle();
  if (challenge.error) throw new DefenseAccessError("No pudimos cargar el desafío.");
  if (!challenge.data) notFound();
  return { slug: challenge.data.slug, name: profile.display_name || "Mi cuenta", role: profile.role,
    title: challenge.data.title, description: challenge.data.description,
    questions: questionsFrom(challenge.data.requirements ?? []), submission: result.data };
}
