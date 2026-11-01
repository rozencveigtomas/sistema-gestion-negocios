import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  dayBounds,
  todayKey,
  validDateKey,
  exportRange,
} from "@/lib/reporting";
import { csv } from "@/lib/csv";

const bad = (message: string, status = 400) =>
  NextResponse.json({ ok: false, message }, { status });

export async function GET(request: Request) {
  const { db, profile, business } = await requireUser();
  const params = new URL(request.url).searchParams;
  const type = params.get("type") || "products";
  if (
    !["products", "sales", "summary"].includes(type) ||
    (params.get("format") || "csv") !== "csv"
  ) {
    return bad("Elegí una exportación CSV de productos, ventas o resumen.");
  }
  const rows: unknown[][] = [];
  if (type === "products") {
    let query = db
      .from("products")
      .select(
        "id,internal_identifier,name,unit_of_measure,current_stock,sale_price,active",
      )
      .order("name")
      .limit(10001);
    if (profile.role !== "boss") query = query.eq("active", true);
    const result = await query;
    if (result.error) return bad("No pudimos exportar los productos.", 500);
    if ((result.data?.length ?? 0) > 10000)
      return bad("La exportación supera 10.000 productos.", 413);
    const costs = new Map<string, number>();
    if (profile.role === "boss") {
      const financials = await db
        .from("product_financials")
        .select("product_id,cost_price")
        .limit(10001);
      if (financials.error || (financials.data?.length ?? 0) > 10000)
        return bad("No pudimos exportar los costos completos.", 500);
      for (const item of financials.data ?? [])
        costs.set(item.product_id, Number(item.cost_price));
    }
    rows.push([
      "SKU",
      "Producto",
      "Unidad",
      "Stock actual",
      "Precio venta",
      ...(profile.role === "boss" ? ["Costo unitario"] : []),
      "Estado",
    ]);
    for (const item of result.data ?? [])
      rows.push([
        item.internal_identifier,
        item.name,
        item.unit_of_measure,
        item.current_stock,
        item.sale_price,
        ...(profile.role === "boss" ? [costs.get(item.id) ?? ""] : []),
        item.active ? "Activo" : "Archivado",
      ]);
  } else if (type === "summary") {
    if (profile.role !== "boss")
      return bad("Este informe está disponible solo para jefes.", 403);
    const day = params.get("date") || todayKey();
    if (!validDateKey(day) || day > todayKey())
      return bad("La fecha no es válida.");
    const generated = await db.rpc("generate_daily_summary", {
      p_summary_date: day,
    });
    if (generated.error) return bad("No pudimos generar el resumen.", 500);
    const result = await db
      .from("daily_summaries")
      .select(
        "net_sales,cost_of_goods,expenses,refunds,estimated_profit,sales_count",
      )
      .eq("id", generated.data)
      .single();
    if (result.error || !result.data)
      return bad("No pudimos leer el resumen.", 500);
    const summary = result.data;
    rows.push(
      ["Indicador", "Valor"],
      ["Vendido", summary.net_sales],
      ["Costo de productos", summary.cost_of_goods],
      ["Gastos", summary.expenses],
      ["Devoluciones", summary.refunds],
      ["Ganancia estimada", summary.estimated_profit],
      ["Cantidad de ventas", summary.sales_count],
    );
  } else {
    const day = dayBounds(todayKey());
    const range = exportRange(
      params.get("from") || day.from,
      params.get("to") || day.to,
    );
    if (!range)
      return bad("El rango de ventas no es válido o supera 366 días.");
    const result = await db
      .from("sales")
      .select("total,payment_method,status,occurred_at")
      .gte("occurred_at", range.from)
      .lt("occurred_at", range.to)
      .order("occurred_at", { ascending: false })
      .limit(10001);
    if (result.error) return bad("No pudimos exportar las ventas.", 500);
    if ((result.data?.length ?? 0) > 10000)
      return bad("Elegí un rango más corto: hay más de 10.000 ventas.", 413);
    rows.push(["Fecha", "Medio de pago", "Total", "Estado"]);
    for (const sale of result.data ?? [])
      rows.push([
        new Date(sale.occurred_at).toLocaleString("es-AR", {
          timeZone: business.timezone,
        }),
        sale.payment_method,
        sale.total,
        sale.status,
      ]);
  }
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${todayKey()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
