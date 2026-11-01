import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import type { ReturnRecord, SaleItem } from "@/lib/types";
import { ReturnForm } from "@/components/operations-forms";
export default async function Returns() {
  const { db, profile } = await requireUser();
  const [
    { data: items, error: itemError },
    { data: returns, error: returnError },
  ] = await Promise.all([
    db
      .from("sale_items")
      .select(
        "id,sale_id,product_id,quantity,unit_price,discount_amount,final_unit_price,offer_id,products(name,internal_identifier,unit_of_measure),sales(occurred_at,status)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("returns")
      .select(
        "id,sale_id,sale_item_id,product_id,quantity,unit_price,refund_amount,disposition,reason,status,occurred_at,products(name)",
      )
      .order("occurred_at", { ascending: false })
      .limit(100),
  ]);
  const saleItems = (items ?? []).filter(
    (item) => (item.sales as unknown as {status: string} | null)?.status === "completed",
  ) as unknown as SaleItem[];
  return (
    <>
      <Link prefetch={false} className="text-link" href="/ventas">← Volver a ventas</Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">POSTVENTA</span>
          <h1>Devoluciones</h1>
          <p>
            Relacioná cada devolución con el artículo vendido y definí su
            destino.
          </p>
        </div>
      </div>
      {itemError ? (
        <p className="feedback failure" role="alert">
          No pudimos cargar los artículos vendidos.
        </p>
      ) : !saleItems.length ? (
        <p className="empty-state">
          Todavía no hay artículos de ventas disponibles para devolver.
        </p>
      ) : (
        <section className="panel">
          <ReturnForm
            items={saleItems}
            idempotencyKey={randomUUID()}
            boss={profile.role === "boss"}
          />
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>Devoluciones recientes</h2>
        </div>
        {returnError ? (
          <p className="feedback failure" role="alert">
            No pudimos cargar las devoluciones.
          </p>
        ) : returns?.length ? (
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
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Reintegro</th>
                  <th>Destino</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {(returns as unknown as ReturnRecord[]).map((r) => (
                  <tr key={r.id}>
                    <td>{dateTime(r.occurred_at)}</td>
                    <td>{r.products?.name ?? "Producto"}</td>
                    <td>{Number(r.quantity).toLocaleString("es-AR")}</td>
                    <td>{money(Number(r.refund_amount))}</td>
                    <td>
                      {{
                        reenter: "Reingresa al stock",
                        damaged: "Dañado",
                        supplier: "Proveedor",
                        non_sellable: "No vendible",
                        pending_review: "Pendiente",
                      }[r.disposition] ?? r.disposition}
                    </td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No hay devoluciones registradas.</p>
        )}
      </section>
    </>
  );
}
