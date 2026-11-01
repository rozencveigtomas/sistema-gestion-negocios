"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  catalogItemSchema,
  movementSchema,
  productSchema,
  idSchema,
} from "@/lib/validation";
import { operationError, refreshStock } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

export async function createCatalogItem(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const parsed = catalogItemSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Ingresá un nombre de al menos dos caracteres.",
    };
  const value = parsed.data;
  const { error } = await db.rpc("create_catalog_item", {
    p_kind: value.kind,
    p_name: value.name,
    p_description: value.description,
  });
  if (error) return operationError(error, "No pudimos guardar el registro.");
  revalidatePath("/catalogo");
  revalidatePath("/productos/nuevo");
  return { ok: true, message: "Registro creado." };
}

export async function createProduct(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Revisá nombre, código, categoría, ubicación, precios y stock.",
    };
  const value = parsed.data;
  // Historical RPC parameters stay at their defaults; the removed fields are not part of the form.
  const { data, error } = await db.rpc("create_product", {
    p_internal_identifier: value.internal_identifier,
    p_name: value.name,
    p_category_id: value.category_id,
    p_location_id: value.location_id,
    p_cost_price: value.cost_price,
    p_sale_price: value.sale_price,
    p_initial_stock: value.initial_stock,
    p_unit_of_measure: value.unit_of_measure,
    p_color: value.color,
    p_size: value.size,
    p_description: value.description,
    p_brand: value.brand,
    p_supplier_id: value.supplier_id || null,
    p_expiration_date: value.expiration_date || null,
    p_internal_notes: value.internal_notes,
    p_barcode: "",
    p_model: "",
    p_variant: "",
    p_minimum_stock: 0,
    p_ideal_stock: null,
  });
  if (error) return operationError(error, "No pudimos crear el producto.");
  refreshStock();
  redirect(`/productos/${data}`);
}

export async function adjustStock(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db, profile } = await requireUser();
  const parsed = movementSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { ok: false, message: "Revisá la operación y la cantidad." };
  const value = parsed.data;
  if (profile.role !== "boss" && value.reason === "correction")
    return { ok: false, message: "Las correcciones requieren al jefe." };
  const { error } = await db.rpc("adjust_stock", {
    p_product_id: value.product_id,
    p_movement_type: value.movement_type,
    p_quantity: value.quantity,
    p_reason: value.reason,
    p_notes: value.notes,
    p_occurred_at: value.occurred_at
      ? new Date(value.occurred_at).toISOString()
      : new Date().toISOString(),
  });
  if (error)
    return operationError(error, "No pudimos guardar el cambio de stock.");
  refreshStock();
  revalidatePath(`/productos/${value.product_id}`);
  return { ok: true, message: "Stock actualizado." };
}

export async function setProductActive(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { db } = await requireUser(true);
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || !["true", "false"].includes(String(form.get("active"))))
    return { ok: false, message: "Producto inválido." };
  const { error } = await db.rpc("set_product_active", {
    p_product_id: id.data,
    p_active: form.get("active") === "true",
  });
  if (error)
    return operationError(error, "No pudimos cambiar el estado del producto.");
  refreshStock();
  revalidatePath(`/productos/${id.data}`);
  return { ok: true, message: "Estado actualizado." };
}
