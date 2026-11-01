import { requireUser } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import type {
  InventoryCountItem,
  InventorySession,
  Product,
} from "@/lib/types";
import {
  CountForm,
  DecisionForm,
  InventorySessionForm,
  StartSessionForm,
  SubmitSessionForm,
} from "@/components/physical-forms";

const statuses = {
  preparation: "Por iniciar",
  in_progress: "Contando",
  recount: "Volver a contar",
  pending_approval: "Revisar diferencias",
  completed: "Terminado",
  cancelled: "Cancelado",
};

export default async function Inventories() {
  const { db, profile } = await requireUser();
  const boss = profile.role === "boss";
  const [products, sessions] = await Promise.all([
    boss
      ? db
          .from("products")
          .select("id,name,internal_identifier")
          .eq("active", true)
          .order("name")
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
    db
      .from("inventory_sessions")
      .select("id,name,status,pause_sales,created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const sessionRows = (sessions.data ?? []) as InventorySession[];
  const ids = sessionRows.map((session) => session.id);
  const counts = ids.length
    ? await db
        .from("inventory_count_items")
        .select(
          "id,session_id,product_id,expected_stock,first_count,second_count,final_count,difference,products(name,internal_identifier,unit_of_measure)",
        )
        .in("session_id", ids)
        .limit(3000)
    : { data: [], error: null };
  const bySession = new Map<string, InventoryCountItem[]>();
  for (const item of (counts.data ?? []) as unknown as InventoryCountItem[]) {
    const list = bySession.get(item.session_id) ?? [];
    list.push(item);
    bySession.set(item.session_id, list);
  }

  function renderSession(session: InventorySession) {
    const items = bySession.get(session.id) ?? [];
    const active =
      session.status === "in_progress" || session.status === "recount";
    const counted = items.filter((item) => item.final_count !== null).length;
    return (
      <article className="panel" key={session.id}>
        <div className="section-heading">
          <div>
            <h2>{session.name}</h2>
            <p className="muted">
              {dateTime(session.created_at)} · {statuses[session.status]}
            </p>
          </div>
          <span>
            {counted}/{items.length} contados
          </span>
        </div>
        {session.status === "preparation" && boss && (
          <StartSessionForm id={session.id} />
        )}
        {active && (
          <>
            <div className="count-grid">
              {items.map((item) => (
                <CountForm key={item.id} item={item} sessionId={session.id} />
              ))}
            </div>
            {boss && <SubmitSessionForm id={session.id} />}
          </>
        )}
        {!active && items.length > 0 && (
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Comparación del conteo"
          >
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Registrado</th>
                  <th>Contado</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.products?.name}</td>
                    <td>
                      {Number(item.expected_stock).toLocaleString("es-AR")}
                    </td>
                    <td>
                      {item.final_count === null
                        ? "Sin contar"
                        : Number(item.final_count).toLocaleString("es-AR")}
                    </td>
                    <td>
                      {item.difference === null
                        ? "—"
                        : Number(item.difference).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {session.status === "pending_approval" &&
          (boss ? (
            <DecisionForm id={session.id} />
          ) : (
            <p className="note">El jefe debe revisar y aprobar este conteo.</p>
          ))}
      </article>
    );
  }

  const pending = sessionRows.filter(
    (session) => !["completed", "cancelled"].includes(session.status),
  );
  const closed = sessionRows.filter((session) =>
    ["completed", "cancelled"].includes(session.status),
  );
  const loadError = sessions.error || counts.error;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Contar stock</h1>
          <p>
            Contá los productos, guardá las cantidades y pedí al jefe que las
            apruebe.
          </p>
        </div>
      </div>
      {boss && (
        <details className="panel more-fields">
          <summary>Nuevo conteo</summary>
          {products.error ? (
            <p className="feedback failure" role="alert">
              No pudimos cargar los productos.
            </p>
          ) : !products.data?.length ? (
            <p>Cargá un producto antes de contar stock.</p>
          ) : (
            <InventorySessionForm products={products.data as Product[]} />
          )}
        </details>
      )}
      {loadError ? (
        <p className="feedback failure" role="alert">
          No pudimos cargar los conteos completos. Recargá la página.
        </p>
      ) : (
        <>
          {pending.length ? (
            pending.map(renderSession)
          ) : (
            <p className="empty-state">No hay conteos pendientes.</p>
          )}
          {closed.length > 0 && (
            <details className="more-fields">
              <summary>Conteos terminados ({closed.length})</summary>
              {closed.map(renderSession)}
            </details>
          )}
        </>
      )}
    </>
  );
}
