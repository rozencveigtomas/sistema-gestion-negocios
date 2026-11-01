import "server-only";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./types";

export function refreshStock() {
  for (const path of [
    "/productos",
    "/ventas",
    "/movimientos",
    "/inventarios",
    "/inicio",
    "/analisis",
  ])
    revalidatePath(path);
}

export function operationError(
  error: { code?: string; message?: string },
  fallback: string,
): ActionResult {
  if (error.code === "42501")
    return { ok: false, message: "No tenés permisos para esta operación." };
  if (error.code === "23505")
    return { ok: false, message: "Ya existe un registro con esos datos." };
  if (error.code === "22023") {
    if (/stock insuficiente|stock disponible/i.test(error.message ?? ""))
      return { ok: false, message: "No hay stock suficiente." };
    if (/pausad/i.test(error.message ?? ""))
      return {
        ok: false,
        message: "Las ventas están pausadas durante el conteo.",
      };
    if (/entero|cantidad/i.test(error.message ?? ""))
      return {
        ok: false,
        message: "Revisá la cantidad y la unidad del producto.",
      };
    return {
      ok: false,
      message: "Revisá los datos y el estado de la operación.",
    };
  }
  return { ok: false, message: fallback };
}
