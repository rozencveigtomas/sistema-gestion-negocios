import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { money, dateTime } from "@/lib/format";
import type { Product, Sale } from "@/lib/types";
import { SaleForm, CancelSaleForm } from "@/components/operations-forms";

const paymentNames: Record<string, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
  other: "Otro",
};

export default async function Sales({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { db, profile } = await requireUser();
  const params = await searchParams;
  const [products, sales] = await Promise.all([
    db
      .from("products")
      .select(
        "id,internal_identifier,name,sale_price,current_stock,unit_of_measure",
      )
      .eq("active", true)
      .order("name")
      .limit(1000),
    db
      .from("sales")
      .select(
        "id,status,payment_method,total,occurred_at,seller_id,profiles(name)",
      )
      .order("occurred_at", { ascending: false })
      .limit(30),
  ]);
  const list = (products.data ?? []) as Product[];
  const history = (sales.data ?? []) as unknown as Sale[];
  const preselected = list.find(
    (product) =>
      product.id === params.product && Number(product.current_stock) > 0,
  )?.id;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Registrar venta</h1>
          <p>Elegí productos, cantidades y medio de pago.</p>
        </div>
        <div className="button-row">
          <Link prefetch={false} className="button secondary" href="/devoluciones">
            Devoluciones
          </Link>
          {profile.role === "boss" && (
            <Link prefetch={false} className="button secondary" href="/ofertas">
              Ofertas
            </Link>
          )}
        </div>
      </div>
      {products.error ? (
        <p className="feedback failure" role="alert">
          No pudimos cargar los productos.
        </p>
      ) : !list.length ? (
        <p className="empty-state">
          Cargá un producto desde Catálogo/Categorías para empezar a vender.
        </p>
      ) : (
        <section className="panel">
          <SaleForm
            products={list}
            idempotencyKey={randomUUID()}
            selectedProductId={preselected}
          />
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>Últimas ventas</h2>
          <a className="text-link" href="/api/export?type=sales">
            CSV de hoy
          </a>
        </div>
        {sales.error ? (
          <p className="feedback failure" role="alert">
            No pudimos cargar las ventas.
          </p>
        ) : !history.length ? (
          <p className="empty-state">Todavía no hay ventas.</p>
        ) : (
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Últimas ventas"
          >
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Vendedor</th>
                  <th>Pago</th>
                  <th>Total</th>
                  <th>Estado</th>
                  {profile.role === "boss" && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {history.map((sale) => (
                  <tr key={sale.id}>
                    <td>{dateTime(sale.occurred_at)}</td>
                    <td>{sale.profiles?.name ?? "Yo"}</td>
                    <td>
                      {paymentNames[sale.payment_method] ?? sale.payment_method}
                    </td>
                    <td>{money(Number(sale.total))}</td>
                    <td>
                      {sale.status === "cancelled" ? "Cancelada" : "Completada"}
                    </td>
                    {profile.role === "boss" && (
                      <td>
                        {sale.status === "completed" && (
                          <CancelSaleForm id={sale.id} />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
