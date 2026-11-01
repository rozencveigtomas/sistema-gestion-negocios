import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isConfigured, supabase } from "./supabase/server";
import type { Business, Profile } from "./types";

// Layout and page share these checks within the same request.
const currentSession = cache(async () => {
  if (!isConfigured()) redirect("/acceso");
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/acceso");
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id,business_id,auth_user_id,name,email,role,active,last_login_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (profileError || !profile?.active) redirect("/sin-acceso");
  const { data: business, error: businessError } = await db
    .from("businesses")
    .select(
      "id,name,service_name,tax_identifier,brand_color,support_email,currency,timezone,is_demo",
    )
    .eq("id", profile.business_id)
    .single();
  if (businessError || !business) redirect("/sin-acceso");
  return {
    db,
    user,
    profile: profile as Profile,
    business: business as Business,
  };
});

export async function requireUser(bossOnly = false) {
  const session = await currentSession();
  if (bossOnly && session.profile.role !== "boss") redirect("/inicio");
  return session;
}
