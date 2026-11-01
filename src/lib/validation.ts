import { z } from "zod";
import { normalizeColorList } from "@/lib/quantities";

export const idSchema = z.string().uuid();
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Ingresá un correo válido.")
  .max(254);
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña.").max(128),
});
export const passwordSchema = z
  .string()
  .min(12, "Usá al menos 12 caracteres.")
  .max(128, "Usá hasta 128 caracteres.");

const text = (max: number) => z.string().trim().max(max).default("");
const optionalId = z.union([idSchema, z.literal("")]).default("");
const optionalTime = z
  .union([z.string().datetime({ local: true }), z.literal("")])
  .default("");
const numberInput = (schema: z.ZodType<number, unknown>) =>
  z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? undefined : value),
    schema,
  );
const decimal = numberInput(z.coerce.number().finite().min(0).max(99999999999));
const quantity = numberInput(
  z.coerce.number().finite().positive().max(999999999),
);
const paymentMethod = z.enum(["cash", "debit", "credit", "transfer", "other"]);

export const businessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  service_name: z.string().trim().min(2).max(100),
  tax_identifier: text(30),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  support_email: z.union([emailSchema, z.literal("")]).default(""),
});
export const invitationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
});
export const employeeSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(2).max(100),
  role: z.enum(["boss", "employee"]),
  active: z.boolean(),
});
export const catalogItemSchema = z.object({
  kind: z.enum(["category", "location", "supplier"]),
  name: z.string().trim().min(2).max(100),
  description: text(1000),
});
export const productSchema = z.object({
  internal_identifier: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(150),
  category_id: idSchema,
  location_id: idSchema,
  unit_of_measure: z.enum([
    "unidad",
    "kg",
    "g",
    "l",
    "ml",
    "m",
    "cm",
    "caja",
    "paquete",
  ]),
  cost_price: decimal,
  sale_price: decimal,
  initial_stock: decimal,
  color: text(80).transform(normalizeColorList),
  size: text(80),
  description: text(2000),
  brand: text(100),
  supplier_id: optionalId,
  expiration_date: z.union([z.string().date(), z.literal("")]).default(""),
  internal_notes: text(3000),
});

// Sales and customer returns use their own transactions, never a manual stock adjustment.
export const movementSchema = z
  .object({
    product_id: idSchema,
    movement_type: z.enum(["entry", "exit"]),
    quantity,
    reason: z.enum(["purchase", "damage", "internal_use", "correction"]),
    notes: text(2000),
    occurred_at: optionalTime,
  })
  .refine(
    (value) =>
      value.reason === "correction" ||
      (value.movement_type === "entry"
        ? value.reason === "purchase"
        : ["damage", "internal_use"].includes(value.reason)),
    { message: "La operación no corresponde al motivo." },
  );

export const saleSchema = z.object({
  idempotency_key: idSchema,
  items: z.string().min(2).max(20000),
  payment_method: paymentMethod,
  client_name: text(150),
  occurred_at: optionalTime,
});
export const saleItemsSchema = z
  .array(z.object({ product_id: idSchema, quantity }))
  .min(1)
  .max(100)
  .refine(
    (items) =>
      new Set(items.map((item) => item.product_id)).size === items.length,
    { message: "Cada producto debe aparecer una sola vez." },
  );
export const expenseSchema = z.object({
  concept: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(80),
  amount: decimal.refine((value) => value > 0),
  payment_method: paymentMethod,
  supplier_id: optionalId,
  receipt_reference: text(160),
  notes: text(2000),
  status: z.enum(["pending", "paid"]).default("paid"),
  occurred_at: optionalTime,
});
export const returnSchema = z.object({
  idempotency_key: idSchema,
  sale_item_id: idSchema,
  quantity,
  disposition: z.enum([
    "reenter",
    "damaged",
    "supplier",
    "non_sellable",
    "pending_review",
  ]),
  refund_amount: decimal,
  reason: z.string().trim().min(2).max(160),
  notes: text(2000),
  occurred_at: optionalTime,
});
export const offerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    scope: z.enum(["product", "category"]),
    product_id: optionalId,
    category_id: optionalId,
    discount_type: z.enum(["percent", "fixed", "price"]),
    value: decimal.refine((value) => value > 0),
    starts_at: z.string().datetime({ local: true }),
    ends_at: z.string().datetime({ local: true }),
    description: text(1000),
    priority: z.coerce.number().int().min(-1000).max(1000).default(0),
  })
  .refine(
    (value) =>
      value.scope === "product"
        ? Boolean(value.product_id) && !value.category_id
        : Boolean(value.category_id) && !value.product_id,
    { message: "Elegí un producto o una categoría.", path: ["scope"] },
  )
  .refine((value) => new Date(value.ends_at) > new Date(value.starts_at), {
    message: "La oferta debe terminar después de comenzar.",
    path: ["ends_at"],
  })
  .refine((value) => value.discount_type !== "percent" || value.value <= 100, {
    message: "El porcentaje no puede superar 100.",
    path: ["value"],
  });

export const inventorySessionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  product_ids: z.string().min(2).max(20000),
  sector: text(120),
  location_id: optionalId,
  pause_sales: z.enum(["true", "false"]).default("true"),
});
export const inventoryCountSchema = z.object({
  session_id: idSchema,
  product_id: idSchema,
  first_count: numberInput(z.coerce.number().finite().min(0).max(999999999)),
  second_count: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+(?:\.\d+)?$/.test(value) && Number(value) <= 999999999),
      { message: "El segundo conteo no es válido." },
    )
    .default(""),
});

export function safeNext(value: string | null): string {
  return value && /^\/(?!\/)[a-z0-9/_-]*(?:\?[a-z0-9=&_-]*)?$/i.test(value)
    ? value
    : "/inicio";
}
