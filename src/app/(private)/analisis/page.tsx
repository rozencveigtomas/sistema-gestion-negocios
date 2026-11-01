import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { dayBounds, todayKey, validDateKey } from "@/lib/reporting";
import type { DailySummary } from "@/lib/types";

export default async function Analysis({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { db, profile } = await requireUser();
  const params = await searchParams;
  const today = todayKey();
  const day =
    validDateKey(params.date) && params.date! <= today ? params.date! : today;
  const boss = profile.role === "boss";
  let error = false;
  let figures: { label: string; value: string }[] = [];

  if (boss) {
    const generated = await db.rpc("generate_daily_summary", {
      p_summary_date: day,
    });
    if (generated.error || !generated.data) error = true;
    else {
      const result = await db
        .from("daily_summaries")
        .select(
          "net_sales,cost_of_goods,expenses,refunds,estimated_profit,sales_count",
        )
        .eq("id", generated.data)
        .single();
      const summary = result.data as Pick<
        DailySummary,
        | "net_sales"
        | "cost_of_goods"
        | "expenses"
        | "refunds"
        | "estimated_profit"
        | "sales_count"
      > | null;
      error = Boolean(result.error || !summary);
      if (summary)
        figures = [
          { label: "Vendido", value: money(Number(summary.net_sales)) },
          {
            label: "Costo de productos",
            value: money(Number(summary.cost_of_goods)),
          },
          { label: "Gastos", value: money(Number(summary.expenses)) },
          { label: "Devoluciones", value: money(Number(summary.refunds)) },
          {
            label: "Ganancia estimada",
            value: money(Number(summary.estimated_profit)),
          },
          { label: "Cantidad de ventas", value: String(summary.sales_count) },
        ];
    }
  } else {
    const bounds = dayBounds(day);
    const [sales, returns] = await Promise.all([
      db
        .from("sales")
        .select("total")
        .eq("status", "completed")
        .gte("occurred_at", bounds.from)
        .lt("occurred_at", bounds.to)
        .limit(1000),
      db
        .from("returns")
        .select("refund_amount")
        .eq("status", "completed")
        .gte("occurred_at", bounds.from)
        .lt("occurred_at", bounds.to)
        .limit(1000),
    ]);
    error = Boolean(
      sales.error ||
      returns.error ||
      sales.data?.length === 1000 ||
      returns.data?.length === 1000,
    );
    figures = [
      {
        label: "Vendido por mí",
        value: money(
          (sales.data ?? []).reduce((sum, row) => sum + Number(row.total), 0),
        ),
      },
      {
        label: "Mis devoluciones",
        value: money(
          (returns.data ?? []).reduce(
            (sum, row) => sum + Number(row.refund_amount),
            0,
          ),
        ),
      },
      { label: "Cantidad de ventas", value: String(sales.data?.length ?? 0) },
    ];
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Resumen del día</h1>
          <p>
            {boss
              ? "Ventas, gastos y resultado del comercio."
              : "Solo tu actividad. Los datos de costos y ganancias son privados del jefe."}
          </p>
        </div>
        {boss && (
          <Link prefetch={false} className="button secondary" href="/gastos">
            Registrar gasto
          </Link>
        )}
      </div>
      <form className="filter-bar">
        <label>
          Fecha
          <input type="date" name="date" defaultValue={day} max={today} />
        </label>
        <button className="button secondary">Ver resumen</button>
        {boss && (
          <a
            className="button secondary"
            href={`/api/export?type=summary&date=${day}`}
          >
            Descargar CSV
          </a>
        )}
      </form>
      {error ? (
        <p className="feedback failure" role="alert">
          No pudimos obtener un resumen completo. Revisá la fecha e intentá
          nuevamente.
        </p>
      ) : (
        <>
          <section className="dashboard-metrics">
            {figures.map((figure) => (
              <div className="metric-card" key={figure.label}>
                <span>{figure.label}</span>
                <strong>{figure.value}</strong>
              </div>
            ))}
          </section>
          {boss && (
            <p className="note">
              Ganancia estimada = vendido − costo de productos − gastos −
              devoluciones. Los importes usan horario de Buenos Aires.
            </p>
          )}
        </>
      )}
    </>
  );
}
