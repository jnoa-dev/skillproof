"use client";

import { createContext, useContext } from "react";

export type InterviewProfile = { name: string; role: string | null };
const ProfileContext = createContext<InterviewProfile | null>(null);

export function InterviewProfileProvider({ profile, children }: { profile: InterviewProfile; children: React.ReactNode }) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useInterviewProfile() {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error("El perfil debe cargarse antes de mostrar las entrevistas.");
  return profile;
}
