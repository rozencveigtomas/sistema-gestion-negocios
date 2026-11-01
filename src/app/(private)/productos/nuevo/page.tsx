import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProductForm } from "@/components/inventory-forms";
import type { Category, Location, Supplier } from "@/lib/types";

export default async function NewProduct() {
  const { db } = await requireUser(true);
  const [categories, locations, suppliers] = await Promise.all([
    db
      .from("categories")
      .select("id,name")
      .eq("active", true)
      .order("name")
      .limit(1000),
    db
      .from("locations")
      .select("id,name")
      .eq("active", true)
      .order("name")
      .limit(1000),
    db
      .from("suppliers")
      .select("id,name")
      .eq("active", true)
      .order("name")
      .limit(1000),
  ]);
  const error = categories.error || locations.error || suppliers.error;
  return (
    <>
      <Link prefetch={false} className="text-link" href="/productos">
        ← Volver al catálogo
      </Link>
      <div className="page-heading">
        <div>
          <h1>Agregar producto</h1>
        </div>
      </div>
      {error ? (
        <p className="feedback failure" role="alert">
          No pudimos cargar las opciones. Recargá la página.
        </p>
      ) : !categories.data?.length || !locations.data?.length ? (
        <section className="panel">
          <p>Primero creá una categoría y una ubicación.</p>
          <Link prefetch={false} className="button primary" href="/catalogo">
            Configurar categorías
          </Link>
        </section>
      ) : (
        <section className="panel">
          <ProductForm
            categories={categories.data as Category[]}
            locations={locations.data as Location[]}
            suppliers={(suppliers.data ?? []) as Supplier[]}
          />
        </section>
      )}
    </>
  );
}
