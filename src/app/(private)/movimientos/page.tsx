import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dateTime } from "@/lib/format";

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

export default async function Movements() {
  const { db } = await requireUser();
  const { data, error } = await db
    .from("inventory_movements")
    .select(
      "id,product_id,movement_type,quantity,resulting_stock,reason,occurred_at,products(name),profiles!inventory_movements_business_id_performed_by_fkey(name)",
    )
    .order("occurred_at", { ascending: false })
    .limit(100);
  return (
    <>
      <Link prefetch={false} className="text-link" href="/productos">
        ← Volver al catálogo
      </Link>
      <div className="page-heading">
        <div>
          <h1>Historial de stock</h1>
          <p>Últimos 100 cambios. Las ventas también aparecen en Ventas.</p>
        </div>
      </div>
      <section className="panel">
        {error ? (
          <p className="feedback failure" role="alert">
            No pudimos cargar el historial.
          </p>
        ) : !data?.length ? (
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
                  <th>Producto</th>
                  <th>Operación</th>
                  <th>Cantidad</th>
                  <th>Stock final</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td>{dateTime(item.occurred_at)}</td>
                    <td>
                      <Link prefetch={false} href={`/productos/${item.product_id}`}>
                        {
                          (item.products as unknown as { name: string } | null)
                            ?.name
                        }
                      </Link>
                    </td>
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
      </section>
    </>
  );
}
