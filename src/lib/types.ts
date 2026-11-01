export type Profile = {
  id: string;
  business_id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: "boss" | "employee";
  active: boolean;
  last_login_at: string | null;
};
export type Business = {
  id: string;
  name: string;
  service_name: string;
  tax_identifier: string | null;
  brand_color: string;
  support_email: string | null;
  currency: "ARS";
  timezone: string;
  is_demo: boolean;
};
export type ActionResult = { ok: boolean; message: string };
export type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};
export type Location = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};
export type Supplier = { id: string; name: string; active: boolean };
export type Product = {
  id: string;
  internal_identifier: string;
  barcode: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  category_id: string;
  location_id: string;
  supplier_id: string | null;
  color: string | null;
  size: string | null;
  model: string | null;
  variant: string | null;
  unit_of_measure: string;
  sale_price: number;
  current_stock: number;
  minimum_stock: number;
  ideal_stock: number | null;
  expiration_date: string | null;
  active: boolean;
  categories?: { name: string } | null;
  locations?: { name: string } | null;
};
export type Sale = {
  id: string;
  status: "completed" | "cancelled";
  payment_method: string;
  subtotal: number;
  discount_total: number;
  total: number;
  cost_total: number;
  client_name: string | null;
  occurred_at: string;
  seller_id: string;
  profiles?: { name: string } | null;
};
export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  final_unit_price: number;
  unit_cost: number;
  offer_id: string | null;
  products?: {
    name: string;
    internal_identifier: string;
    unit_of_measure?: string;
  } | null;
};
export type Expense = {
  id: string;
  concept: string;
  category: string;
  amount: number;
  payment_method: string;
  status: "pending" | "paid" | "void";
  occurred_at: string;
  supplier_id: string | null;
  suppliers?: { name: string } | null;
};
export type ReturnRecord = {
  id: string;
  sale_id: string;
  sale_item_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  disposition: string;
  reason: string;
  status: "completed" | "cancelled";
  occurred_at: string;
  products?: { name: string } | null;
};
export type Offer = {
  id: string;
  name: string;
  scope: "product" | "category";
  product_id: string | null;
  category_id: string | null;
  discount_type: "percent" | "fixed" | "price";
  value: number;
  starts_at: string;
  ends_at: string;
  description: string | null;
  priority: number;
  active: boolean;
  products?: { name: string } | null;
  categories?: { name: string } | null;
};
export type InventorySession = {
  id: string;
  name: string;
  sector: string | null;
  location_id: string | null;
  status:
    | "preparation"
    | "in_progress"
    | "recount"
    | "pending_approval"
    | "completed"
    | "cancelled";
  pause_sales: boolean;
  started_at: string | null;
  closed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  locations?: { name: string } | null;
};
export type InventoryCountItem = {
  id: string;
  session_id: string;
  product_id: string;
  expected_stock: number;
  first_count: number | null;
  second_count: number | null;
  final_count: number | null;
  difference: number | null;
  notes: string | null;
  counted_by: string | null;
  recorded_by: string | null;
  products?: {
    name: string;
    internal_identifier: string;
    unit_of_measure?: string;
  } | null;
};
export type DailySummary = {
  id: string;
  business_id: string;
  summary_date: string;
  gross_income: number;
  net_sales: number;
  cost_of_goods: number;
  expenses: number;
  refunds: number;
  estimated_profit: number;
  sales_count: number;
  units_sold: number;
  average_ticket: number;
  top_product_id: string | null;
  top_category_id: string | null;
  top_seller_id: string | null;
  returns_count: number;
  generated_at: string;
};
