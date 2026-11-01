import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
import { ProductFilters } from "@/components/product-filters";

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string; archived?: string }>;
}) {
  const { db, profile } = await requireUser();
  const params = await searchParams;
  const archived = profile.role === "boss" && params.archived === "1";
  let query = db
    .from("products")
    .select(
      "id,internal_identifier,name,unit_of_measure,sale_price,current_stock,minimum_stock,active,categories(name)",
    )
    .eq("active", !archived)
    .order("name")
    .limit(1000);
  const search = (params.q ?? "")
    .replace(/[%_,()]/g, "")
    .trim()
    .slice(0, 150);
  if (search)
    query = query.or(
      `name.ilike.%${search}%,internal_identifier.ilike.%${search}%`,
    );
  const { data, error } = await query;
  const products = ((data ?? []) as unknown as Product[]).filter(
    (product) =>
      params.low !== "1" ||
      Number(product.current_stock) <= Number(product.minimum_stock),
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Catálogo/Categorías</h1>
          <p>Buscá un producto para ver su precio y stock.</p>
        </div>
        {profile.role === "boss" && (
          <Link prefetch={false} className="button primary" href="/productos/nuevo">
            Agregar producto
          </Link>
        )}
      </div>
      <div className="quick-links">
        {profile.role === "boss" && (
          <Link prefetch={false} className="text-link" href="/catalogo">
            Administrar categorías
          </Link>
        )}
        <Link prefetch={false} className="text-link" href="/movimientos">
          Historial de stock
        </Link>
        <a className="text-link" href="/api/export?type=products">
          Descargar CSV
        </a>
      </div>
      <ProductFilters
        query={params.q ?? ""}
        low={params.low === "1"}
        archived={archived}
        showArchived={profile.role === "boss"}
      />
      {error ? (
        <p className="feedback failure" role="alert">
          No pudimos cargar los productos.
        </p>
      ) : !products.length ? (
        <p className="empty-state">
          {search || params.low === "1" || archived
            ? "No hay productos que coincidan con estos filtros."
            : "Todavía no hay productos. El jefe puede cargarlos con Agregar producto."}
        </p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <Link prefetch={false}
              className={`product-card ${archived ? "archived" : ""}`}
              href={`/productos/${product.id}`}
              key={product.id}
            >
              <div>
                <span className="sku">{product.internal_identifier}</span>
                <h2>{product.name}</h2>
                <p>{product.categories?.name}</p>
              </div>
              <div className="stock-line">
                <strong>
                  {Number(product.current_stock).toLocaleString("es-AR")}{" "}
                  {product.unit_of_measure}
                </strong>
                {Number(product.current_stock) <=
                  Number(product.minimum_stock) && (
                  <span className="low-badge">Stock bajo</span>
                )}
              </div>
              <span>{money(Number(product.sale_price))}</span>
            </Link>
          ))}
        </div>
      )}
      {data?.length === 1000 && (
        <p className="note">
          Se muestran hasta 1.000 productos. Buscá por nombre o código para
          acotar la lista.
        </p>
      )}
    </>
  );
}
