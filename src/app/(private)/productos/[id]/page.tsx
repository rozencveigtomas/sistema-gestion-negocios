import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { MovementForm, ProductStatusForm } from "@/components/inventory-forms";
import { money, dateTime } from "@/lib/format";

const reasons: Record<string, string> = {
  initial: "Stock inicial",
  purchase: "Compra",
  return: "Devolución",
  sale: "Venta",
  damage: "Daño",
  loss: "Pérdida",
  internal_use: "Uso del comercio",
  transfer: "Traslado",
  correction: "Corrección",
  other: "Otro",
};

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db, profile } = await requireUser();
  const { id } = await params;
  const boss = profile.role === "boss";
  const { data: product, error } = await db
    .from("products")
    .select(
      "id,internal_identifier,name,color,size,description,unit_of_measure,sale_price,current_stock,active,categories(name),locations(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !product || (!boss && !product.active)) notFound();
  const [movements, financial] = await Promise.all([
    db
      .from("inventory_movements")
      .select(
        "id,movement_type,quantity,resulting_stock,reason,occurred_at,profiles!inventory_movements_business_id_performed_by_fkey(name)",
      )
      .eq("product_id", id)
      .order("occurred_at", { ascending: false })
      .limit(30),
    boss
      ? db
          .from("product_financials")
          .select("cost_price,internal_notes")
          .eq("product_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const category = product.categories as unknown as { name: string } | null;
  const location = product.locations as unknown as { name: string } | null;

  return (
    <>
      <Link prefetch={false} className="text-link" href="/productos">
        ← Volver al catálogo
      </Link>
      <div className="page-heading">
        <div>
          <h1>{product.name}</h1>
          <p>
            {product.internal_identifier} · {category?.name} · {location?.name}
          </p>
        </div>
        {product.active && Number(product.current_stock) > 0 && (
          <Link prefetch={false} className="button primary" href={`/ventas?product=${id}`}>
            Vender este producto
          </Link>
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <h2>{product.active ? "Stock disponible" : "Producto archivado"}</h2>
          <strong className="metric">
            {Number(product.current_stock).toLocaleString("es-AR")}{" "}
            {product.unit_of_measure}
          </strong>
          <dl className="data-list">
            <div>
              <dt>Precio</dt>
              <dd>{money(Number(product.sale_price))}</dd>
            </div>
            {product.color && (
              <div>
                <dt>Color</dt>
                <dd>{product.color}</dd>
              </div>
            )}
            {product.size && (
              <div>
                <dt>Talle o tamaño</dt>
                <dd>{product.size}</dd>
              </div>
            )}
            {financial.data && (
              <div>
                <dt>Costo unitario</dt>
                <dd>{money(Number(financial.data.cost_price))}</dd>
              </div>
            )}
          </dl>
          {financial.error && (
            <p className="feedback failure" role="alert">
              No pudimos cargar el costo.
            </p>
          )}
          {(product.description || financial.data?.internal_notes) && (
            <details className="more-fields">
              <summary>Más datos</summary>
              <p>{product.description}</p>
              {financial.data?.internal_notes && (
                <p>{financial.data.internal_notes}</p>
              )}
            </details>
          )}
          {boss && <ProductStatusForm id={id} active={product.active} />}
        </section>
        {product.active && (
          <section className="panel">
            <h2>Compra o ajuste de stock</h2>
            <MovementForm
              productId={id}
              boss={boss}
              unitOfMeasure={product.unit_of_measure}
            />
          </section>
        )}
      </div>
      <details className="panel more-fields">
        <summary>Historial de stock</summary>
        {movements.error ? (
          <p className="feedback failure" role="alert">
            No pudimos cargar el historial.
          </p>
        ) : !movements.data?.length ? (
          <p>No hay cambios registrados.</p>
        ) : (
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Historial de stock"
          >
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Operación</th>
                  <th>Cantidad</th>
                  <th>Stock final</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {movements.data.map((item) => (
                  <tr key={item.id}>
                    <td>{dateTime(item.occurred_at)}</td>
                    <td>{reasons[item.reason] ?? item.reason}</td>
                    <td>
                      {item.movement_type === "entry" ? "+" : "−"}
                      {Number(item.quantity).toLocaleString("es-AR")}
                    </td>
                    <td>
                      {Number(item.resulting_stock).toLocaleString("es-AR")}
                    </td>
                    <td>
                      {(item.profiles as unknown as { name: string } | null)
                        ?.name ?? "Usuario"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </>
  );
}
