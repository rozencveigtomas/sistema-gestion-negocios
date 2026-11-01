"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  businessSchema,
  employeeSchema,
  invitationSchema,
} from "@/lib/validation";
import { adminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
export async function saveBusiness(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const parsed = businessSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Revisá el nombre, el color y el correo de soporte.",
    };
  const v = parsed.data;
  try {
    const { error } = await db.rpc("update_business", {
      p_name: v.name,
      p_service_name: v.service_name,
      p_tax_identifier: v.tax_identifier,
      p_brand_color: v.brand_color,
      p_support_email: v.support_email,
    });
    if (error)
      return {
        ok: false,
        message:
          "No pudimos guardar los cambios. Revisá los datos e intentá nuevamente.",
      };
    revalidatePath("/", "layout");
    return { ok: true, message: "Configuración guardada." };
  } catch {
    return {
      ok: false,
      message: "No pudimos conectar. Tus cambios todavía no se guardaron.",
    };
  }
}
export async function saveEmployee(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const parsed = employeeSchema.safeParse({
    ...Object.fromEntries(form),
    active: form.get("active") === "on",
  });
  if (!parsed.success)
    return { ok: false, message: "Revisá los datos del empleado." };
  const v = parsed.data;
  try {
    const { error } = await db.rpc("update_employee", {
      p_profile_id: v.id,
      p_name: v.name,
      p_role: v.role,
      p_active: v.active,
    });
    if (error)
      return {
        ok: false,
        message:
          error.code === "22023"
            ? "Debe quedar al menos un jefe activo."
            : "No pudimos actualizar esa cuenta.",
      };
    revalidatePath("/empleados");
    return {
      ok: true,
      message: "Permisos guardados. El historial se conserva.",
    };
  } catch {
    return { ok: false, message: "No pudimos conectar. Intentá nuevamente." };
  }
}
export async function inviteEmployee(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const parsed = invitationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { ok: false, message: "Ingresá un nombre y un correo válidos." };
  try {
    const { data: id, error } = await db.rpc("create_employee_invitation", {
      p_name: parsed.data.name,
      p_email: parsed.data.email,
    });
    if (error)
      return {
        ok: false,
        message:
          "No se pudo crear la invitación. Revisá si la cuenta ya existe o tiene una invitación pendiente.",
      };
    const { error: inviteError } =
      await adminClient().auth.admin.inviteUserByEmail(parsed.data.email, {
        redirectTo: new URL(
          "/auth/confirm?next=/contrasena",
          process.env.APP_URL!,
        ).toString(),
      });
    if (inviteError) {
      const { error: revokeError } = await db.rpc(
        "revoke_employee_invitation",
        { p_invitation_id: id },
      );
      revalidatePath("/empleados");
      return {
        ok: false,
        message: revokeError
          ? "El envío falló y quedó una invitación pendiente. Revocala antes de reintentar."
          : "No se pudo enviar el correo. La invitación se revocó; verificá el servicio de correo antes de reintentar.",
      };
    }
    revalidatePath("/empleados");
    return {
      ok: true,
      message: "Invitación enviada. La cuenta tendrá permisos de empleado.",
    };
  } catch {
    return {
      ok: false,
      message:
        "No se pudo confirmar el envío. Revisá las invitaciones pendientes antes de reintentar.",
    };
  }
}
export async function revokeInvitation(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const id = form.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
    return { ok: false, message: "Invitación inválida." };
  try {
    const { error } = await db.rpc("revoke_employee_invitation", {
      p_invitation_id: id,
    });
    if (error)
      return { ok: false, message: "No pudimos revocar esa invitación." };
    revalidatePath("/empleados");
    return { ok: true, message: "Invitación revocada." };
  } catch {
    return { ok: false, message: "No pudimos conectar." };
  }
}
