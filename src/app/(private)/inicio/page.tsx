import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { dayBounds, todayKey } from "@/lib/reporting";

export default async function Home() {
  const { db, profile } = await requireUser();
  const day = dayBounds(todayKey());
  const [sales, products, inventories] = await Promise.all([
    db
      .from("sales")
      .select("total")
      .eq("status", "completed")
      .gte("occurred_at", day.from)
      .lt("occurred_at", day.to)
      .limit(1000),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    db
      .from("inventory_sessions")
      .select("id", { count: "exact", head: true })
      .in("status", [
        "preparation",
        "in_progress",
        "recount",
        "pending_approval",
      ]),
  ]);
  const error = sales.error || products.error || inventories.error;
  const total = (sales.data ?? []).reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Hola, {profile.name.split(" ")[0]}</h1>
          <p>¿Qué necesitás hacer?</p>
        </div>
      </div>
      <div className="task-grid">
        <Link prefetch={false} className="panel task-link" href="/ventas">
          <h2>Registrar venta</h2>
          <p>Elegí los productos y cobrá.</p>
        </Link>
        <Link prefetch={false} className="panel task-link" href="/productos">
          <h2>Ver productos</h2>
          <p>Consultá precios y sumá compras.</p>
        </Link>
        <Link prefetch={false} className="panel task-link" href="/inventarios">
          <h2>Contar stock</h2>
          <p>Compará lo contado con lo registrado.</p>
        </Link>
      </div>
      {error ? (
        <p className="feedback failure" role="alert">
          No pudimos cargar el resumen. Intentá recargar la página.
        </p>
      ) : (
        <section className="dashboard-metrics">
          <div className="metric-card">
            <span>
              {profile.role === "boss" ? "Ventas de hoy" : "Mis ventas de hoy"}
            </span>
            <strong>{money(total)}</strong>
            <small>
              {sales.data?.length === 1000
                ? "Últimas 1.000 ventas del día"
                : `${sales.data?.length ?? 0} ventas`}
            </small>
          </div>
          <div className="metric-card">
            <span>Productos activos</span>
            <strong>{products.count}</strong>
          </div>
          <div className="metric-card">
            <span>Conteos pendientes</span>
            <strong>{inventories.count}</strong>
          </div>
        </section>
      )}
    </>
  );
}
