import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import type { Expense, Supplier } from "@/lib/types";
import { ExpenseForm } from "@/components/operations-forms";
export default async function Expenses() {
  const { db } = await requireUser(true);
  const [{ data: suppliers }, { data: expenses, error }] = await Promise.all([
    db
      .from("suppliers")
      .select("id,name,active")
      .eq("active", true)
      .order("name")
      .limit(500),
    db
      .from("expenses")
      .select(
        "id,concept,category,amount,payment_method,status,occurred_at,supplier_id,suppliers(name)",
      )
      .order("occurred_at", { ascending: false })
      .limit(100),
  ]);
  return (
    <>
      <Link prefetch={false} className="text-link" href="/analisis">← Volver al resumen</Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INFORMACIÓN GERENCIAL</span>
          <h1>Gastos</h1>
          <p>Registrá gastos para estimar la ganancia administrativa.</p>
        </div>
      </div>
      <section className="panel">
        <ExpenseForm suppliers={(suppliers ?? []) as Supplier[]} />
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Gastos recientes</h2>
        </div>
        {error ? (
          <p className="feedback failure" role="alert">
            No pudimos cargar los gastos.
          </p>
        ) : expenses?.length ? (
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Tabla desplazable"
          >
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Proveedor</th>
                  <th>Importe</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(expenses as unknown as Expense[]).map((e) => (
                  <tr key={e.id}>
                    <td>{dateTime(e.occurred_at)}</td>
                    <td>{e.concept}</td>
                    <td>{e.category}</td>
                    <td>{e.suppliers?.name ?? "—"}</td>
                    <td>{money(Number(e.amount))}</td>
                    <td>
                      {e.status === "paid"
                        ? "Pagado"
                        : e.status === "pending"
                          ? "Pendiente"
                          : "Anulado"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">Todavía no hay gastos.</p>
        )}
      </section>
    </>
  );
}
