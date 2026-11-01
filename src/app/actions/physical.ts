"use server";
import { requireUser } from "@/lib/auth";
import {
  idSchema,
  inventoryCountSchema,
  inventorySessionSchema,
} from "@/lib/validation";
import { operationError, refreshStock } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

export async function createInventorySession(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const parsed = inventorySessionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Indicá un nombre y elegí al menos un producto.",
    };
  let ids: unknown;
  try {
    ids = JSON.parse(parsed.data.product_ids);
  } catch {
    return { ok: false, message: "La selección no es válida." };
  }
  if (
    !Array.isArray(ids) ||
    ids.length < 1 ||
    ids.length > 100 ||
    ids.some((id) => !idSchema.safeParse(id).success) ||
    new Set(ids).size !== ids.length
  )
    return { ok: false, message: "Elegí entre 1 y 100 productos sin repetir." };
  const created = await db.rpc("create_inventory_session", {
    p_name: parsed.data.name,
    p_sector: null,
    p_location_id: null,
    p_pause_sales: true,
    p_product_ids: ids,
  });
  if (created.error)
    return operationError(created.error, "No pudimos crear el conteo.");
  const started = await db.rpc("start_inventory_session", {
    p_session_id: created.data,
  });
  refreshStock();
  return started.error
    ? {
        ok: false,
        message: "Conteo creado. Usá Iniciar conteo para continuarlo.",
      }
    : { ok: true, message: "Conteo iniciado." };
}

export async function startInventorySession(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: "Conteo inválido." };
  const { error } = await db.rpc("start_inventory_session", {
    p_session_id: id.data,
  });
  if (error) return operationError(error, "No pudimos iniciar el conteo.");
  refreshStock();
  return { ok: true, message: "Conteo iniciado." };
}

export async function recordInventoryCount(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser();
  const parsed = inventoryCountSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { ok: false, message: "Ingresá la cantidad contada." };
  const value = parsed.data;
  const { error } = await db.rpc("record_inventory_count", {
    p_session_id: value.session_id,
    p_product_id: value.product_id,
    p_first_count: value.first_count,
    p_second_count:
      value.second_count === "" ? null : Number(value.second_count),
    p_notes: null,
  });
  if (error) return operationError(error, "No pudimos guardar el conteo.");
  refreshStock();
  return { ok: true, message: "Conteo guardado." };
}

export async function submitInventorySession(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: "Conteo inválido." };
  const { error } = await db.rpc("submit_inventory_session", {
    p_session_id: id.data,
  });
  if (error)
    return operationError(error, "Contá todos los productos antes de revisar.");
  refreshStock();
  return { ok: true, message: "Conteo enviado a revisión." };
}

export async function decideInventorySession(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || !["true", "false"].includes(String(form.get("approve"))))
    return { ok: false, message: "Revisión inválida." };
  const approve = form.get("approve") === "true";
  const { error } = await db.rpc("approve_inventory_session", {
    p_session_id: id.data,
    p_approve: approve,
    p_notes: null,
  });
  if (error) return operationError(error, "No pudimos guardar la revisión.");
  refreshStock();
  return {
    ok: true,
    message: approve ? "Stock aprobado y actualizado." : "Recuento solicitado.",
  };
}
