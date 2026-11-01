"use server";
import { redirect } from "next/navigation";
import { supabase, isConfigured } from "@/lib/supabase/server";
import { loginSchema, emailSchema, passwordSchema } from "@/lib/validation";
import { allowAuthAttempt } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/types";
const unavailable: ActionResult = {
  ok: false,
  message:
    "El acceso todavía no está habilitado. Contactá al responsable del comercio.",
};
export async function login(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!isConfigured()) return unavailable;
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { ok: false, message: "Revisá el correo y la contraseña." };
  let successful = false;
  try {
    if (!(await allowAuthAttempt(parsed.data.email, "login")))
      return {
        ok: false,
        message:
          "Se alcanzó el límite de intentos. Esperá 15 minutos e intentá de nuevo.",
      };
    const db = await supabase();
    const { data: signIn, error } = await db.auth.signInWithPassword(
      parsed.data,
    );
    if (error)
      return {
        ok: false,
        message:
          "No pudimos iniciar sesión. Revisá tus datos o recuperá tu contraseña.",
      };
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id,active")
      .eq("auth_user_id", signIn.user!.id)
      .maybeSingle();
    if (profileError || !profile?.active) {
      await db.auth.signOut({ scope: "local" });
      return {
        ok: false,
        message:
          "Tu cuenta no tiene acceso habilitado. Contactá al jefe del comercio.",
      };
    }
    const { error: logError } = await db.rpc("record_login");
    if (logError) {
      await db.auth.signOut({ scope: "local" });
      return {
        ok: false,
        message: "No pudimos completar el acceso. Intentá nuevamente.",
      };
    }
    successful = true;
  } catch {
    return {
      ok: false,
      message: "No pudimos conectar. Revisá tu conexión e intentá nuevamente.",
    };
  }
  if (successful) redirect("/inicio");
  return unavailable;
}
export async function recover(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!isConfigured()) return unavailable;
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success)
    return { ok: false, message: "Ingresá un correo válido." };
  try {
    if (await allowAuthAttempt(parsed.data, "recovery")) {
      const db = await supabase();
      const { error } = await db.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: new URL(
          "/auth/confirm?next=/contrasena",
          process.env.APP_URL!,
        ).toString(),
      });
      // Respuesta uniforme: no se revela existencia de cuentas ni límites específicos por correo.
      if (error)
        console.error("Password recovery provider failure", error.status);
    }
    return {
      ok: true,
      message:
        "Si el correo tiene una cuenta habilitada, recibirás un enlace para cambiar tu contraseña. Revisá también Spam.",
    };
  } catch {
    return {
      ok: false,
      message: "No pudimos conectar. Intentá nuevamente en unos minutos.",
    };
  }
}
export async function changePassword(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!isConfigured()) return unavailable;
  const parsed = passwordSchema.safeParse(form.get("password"));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  if (parsed.data !== form.get("confirmation"))
    return { ok: false, message: "Las contraseñas no coinciden." };
  try {
    const db = await supabase();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user)
      return { ok: false, message: "El enlace venció. Solicitá uno nuevo." };
    const { error: updateError } = await db.auth.updateUser({
      password: parsed.data,
    });
    if (updateError)
      return {
        ok: false,
        message:
          "No pudimos cambiar la contraseña. Usá una distinta o solicitá un nuevo enlace.",
      };
    // Revoca las demás sesiones de refresh. La sesión actual sigue disponible.
    const { error: signOutError } = await db.auth.signOut({ scope: "others" });
    if (signOutError)
      return {
        ok: true,
        message:
          "Contraseña actualizada. No pudimos cerrar otras sesiones; contactá al responsable si tenés sesiones abiertas en otro dispositivo.",
      };
    return {
      ok: true,
      message: "Contraseña actualizada. Ya podés ingresar al comercio.",
    };
  } catch {
    return { ok: false, message: "No pudimos conectar. Intentá nuevamente." };
  }
}
export async function logout() {
  if (isConfigured()) {
    const db = await supabase();
    const { error } = await db.auth.signOut({ scope: "local" });
    if (error) redirect("/sin-acceso?error=logout");
  }
  redirect("/acceso");
}
