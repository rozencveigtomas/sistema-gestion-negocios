import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import { todayKey } from "@/lib/reporting";
import type { Category, Offer, Product } from "@/lib/types";
import { OfferForm, OfferToggle } from "@/components/operations-forms";

export default async function Offers() {
  const { db } = await requireUser(true);
  const [products, categories, offers] = await Promise.all([
    db
      .from("products")
      .select("id,name,internal_identifier")
      .eq("active", true)
      .order("name")
      .limit(1000),
    db
      .from("categories")
      .select("id,name")
      .eq("active", true)
      .order("name")
      .limit(1000),
    db
      .from("offers")
      .select(
        "id,name,discount_type,value,starts_at,ends_at,active,scope,products(name),categories(name)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return (
    <>
      <Link prefetch={false} className="text-link" href="/ventas">
        ← Volver a ventas
      </Link>
      <div className="page-heading">
        <div>
          <h1>Ofertas</h1>
          <p>Descuentos por porcentaje para productos o categorías.</p>
        </div>
      </div>
      {products.error || categories.error ? (
        <p className="feedback failure" role="alert">
          No pudimos cargar las opciones de la oferta.
        </p>
      ) : (
        <details className="panel more-fields">
          <summary>Nueva oferta</summary>
          <OfferForm
            products={(products.data ?? []) as Product[]}
            categories={(categories.data ?? []) as Category[]}
            today={todayKey()}
          />
        </details>
      )}
      <section className="panel">
        <h2>Ofertas creadas</h2>
        {offers.error ? (
          <p className="feedback failure" role="alert">
            No pudimos cargar las ofertas.
          </p>
        ) : !offers.data?.length ? (
          <p>No hay ofertas.</p>
        ) : (
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Ofertas"
          >
            <table>
              <thead>
                <tr>
                  <th>Oferta</th>
                  <th>Se aplica a</th>
                  <th>Descuento</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(offers.data as unknown as Offer[]).map((offer) => (
                  <tr key={offer.id}>
                    <td>{offer.name}</td>
                    <td>
                      {offer.scope === "product"
                        ? offer.products?.name
                        : offer.categories?.name}
                    </td>
                    <td>
                      {offer.discount_type === "percent"
                        ? `${Number(offer.value)}%`
                        : offer.discount_type === "fixed"
                          ? money(Number(offer.value))
                          : `Precio ${money(Number(offer.value))}`}
                    </td>
                    <td>
                      {dateTime(offer.starts_at)}
                      <br />
                      {dateTime(offer.ends_at)}
                    </td>
                    <td>
                      {!offer.active
                        ? "Desactivada"
                        : new Date(offer.ends_at) < new Date()
                          ? "Terminada"
                          : new Date(offer.starts_at) > new Date()
                            ? "Programada"
                            : "Vigente"}
                    </td>
                    <td>
                      <OfferToggle id={offer.id} active={offer.active} />
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
