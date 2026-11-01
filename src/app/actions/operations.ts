"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  expenseSchema,
  offerSchema,
  returnSchema,
  saleItemsSchema,
  saleSchema,
  idSchema,
} from "@/lib/validation";
import { operationError, refreshStock } from "@/lib/action-utils";
import { money } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

export async function createSale(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser();
  const parsed = saleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { ok: false, message: "Revisá los datos de la venta." };
  const value = parsed.data;
  let items: unknown;
  try {
    items = JSON.parse(value.items);
  } catch {
    return { ok: false, message: "La lista de productos no es válida." };
  }
  const valid = saleItemsSchema.safeParse(items);
  if (!valid.success)
    return {
      ok: false,
      message: "Elegí productos sin repetir y cantidades válidas.",
    };
  const { data, error } = await db.rpc("create_sale", {
    p_idempotency_key: value.idempotency_key,
    p_items: valid.data,
    p_payment_method: value.payment_method,
    p_client_name: value.client_name || null,
    p_notes: null,
    p_occurred_at: value.occurred_at
      ? new Date(value.occurred_at).toISOString()
      : new Date().toISOString(),
  });
  if (error) return operationError(error, "No pudimos registrar la venta.");
  refreshStock();
  const saved = await db
    .from("sales")
    .select("total")
    .eq("id", data)
    .maybeSingle();
  return {
    ok: true,
    message: saved.data
      ? `Venta registrada. Total cobrado: ${money(Number(saved.data.total))}.`
      : "Venta registrada y stock actualizado.",
  };
}

export async function cancelSale(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const id = idSchema.safeParse(form.get("id"));
  const reason = String(form.get("reason") ?? "").trim();
  if (!id.success || reason.length < 3 || reason.length > 500)
    return { ok: false, message: "Indicá el motivo de cancelación." };
  const { error } = await db.rpc("cancel_sale", {
    p_sale_id: id.data,
    p_reason: reason,
  });
  if (error) return operationError(error, "No pudimos cancelar la venta.");
  refreshStock();
  return { ok: true, message: "Venta cancelada y stock reintegrado." };
}

export async function createExpense(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const parsed = expenseSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Revisá concepto, categoría, importe y fecha.",
    };
  const value = parsed.data;
  const { error } = await db.rpc("create_expense", {
    p_concept: value.concept,
    p_category: value.category,
    p_amount: value.amount,
    p_payment_method: value.payment_method,
    p_supplier_id: value.supplier_id || null,
    p_receipt_reference: value.receipt_reference || null,
    p_notes: value.notes || null,
    p_status: value.status,
    p_occurred_at: value.occurred_at
      ? new Date(value.occurred_at).toISOString()
      : new Date().toISOString(),
  });
  if (error) return operationError(error, "No pudimos guardar el gasto.");
  revalidatePath("/gastos");
  revalidatePath("/analisis");
  return { ok: true, message: "Gasto guardado." };
}

export async function createReturn(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db, profile } = await requireUser();
  const parsed = returnSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Revisá producto, cantidad, motivo e importe.",
    };
  const value = parsed.data;
  if (
    profile.role !== "boss" &&
    ["damaged", "supplier", "non_sellable"].includes(value.disposition)
  )
    return { ok: false, message: "Ese estado requiere aprobación del jefe." };
  const { error } = await db.rpc("create_return", {
    p_idempotency_key: value.idempotency_key,
    p_sale_item_id: value.sale_item_id,
    p_quantity: value.quantity,
    p_disposition: value.disposition,
    p_refund_amount: value.refund_amount,
    p_reason: value.reason,
    p_notes: value.notes || null,
    p_occurred_at: value.occurred_at
      ? new Date(value.occurred_at).toISOString()
      : new Date().toISOString(),
  });
  if (error)
    return operationError(error, "No pudimos registrar la devolución.");
  refreshStock();
  revalidatePath("/devoluciones");
  return { ok: true, message: "Devolución registrada." };
}

export async function createOffer(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const parsed = offerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Revisá producto o categoría, porcentaje y fechas.",
    };
  const value = parsed.data;
  const { error } = await db.rpc("create_offer", {
    p_name: value.name,
    p_scope: value.scope,
    p_product_id: value.product_id || null,
    p_category_id: value.category_id || null,
    p_discount_type: value.discount_type,
    p_value: value.value,
    p_starts_at: new Date(value.starts_at).toISOString(),
    p_ends_at: new Date(value.ends_at).toISOString(),
    p_description: value.description || null,
    p_priority: value.priority,
  });
  if (error) return operationError(error, "No pudimos crear la oferta.");
  revalidatePath("/ofertas");
  revalidatePath("/ventas");
  return { ok: true, message: "Oferta creada." };
}

export async function setOfferActive(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || !["true", "false"].includes(String(form.get("active"))))
    return { ok: false, message: "Oferta inválida." };
  const { error } = await db.rpc("set_offer_active", {
    p_offer_id: id.data,
    p_active: form.get("active") === "true",
  });
  if (error) return operationError(error, "No pudimos actualizar la oferta.");
  revalidatePath("/ofertas");
  revalidatePath("/ventas");
  return { ok: true, message: "Oferta actualizada." };
}
