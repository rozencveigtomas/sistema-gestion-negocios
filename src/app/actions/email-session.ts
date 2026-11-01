"use server";
import { supabase, isConfigured } from "@/lib/supabase/server";
import { emailSessionSchema } from "@/lib/auth-fragment";

// Next server actions enforce same-origin POST. No tokens are put in a URL.
export async function completeEmailSession(
  input: unknown,
): Promise<{ destination: string }> {
  const fail = { destination: "/acceso?error=link" };
  const parsed = emailSessionSchema.safeParse(input);
  if (!parsed.success || !isConfigured()) return fail;
  try {
    const db = await supabase();
    const { error } = await db.auth.setSession(parsed.data);
    if (error) return fail;
    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser();
    if (userError || !user) {
      await db.auth.signOut({ scope: "local" });
      return fail;
    }
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id,active")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profileError || profile?.active === false) {
      await db.auth.signOut({ scope: "local" });
      return fail;
    }
    if (!profile) {
      const { error: acceptError } = await db.rpc("accept_employee_invitation");
      if (acceptError) {
        await db.auth.signOut({ scope: "local" });
        return { destination: "/sin-acceso" };
      }
    }
    const { error: logError } = await db.rpc("record_login");
    if (logError) {
      await db.auth.signOut({ scope: "local" });
      return fail;
    }
    return { destination: "/contrasena" };
  } catch {
    return fail;
  }
}
