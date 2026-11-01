import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CatalogForm } from "@/components/inventory-forms";

export default async function Catalog() {
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
  const sections = [
    {
      title: "Categorías",
      kind: "category" as const,
      label: "categoría",
      result: categories,
    },
    {
      title: "Ubicaciones",
      kind: "location" as const,
      label: "ubicación",
      result: locations,
    },
    {
      title: "Proveedores",
      kind: "supplier" as const,
      label: "proveedor",
      result: suppliers,
    },
  ];
  return (
    <>
      <Link prefetch={false} className="text-link" href="/productos">
        ← Volver al catálogo
      </Link>
      <div className="page-heading">
        <div>
          <h1>Categorías y ubicaciones</h1>
          <p>
            Creá una categoría y una ubicación para empezar a cargar productos.
          </p>
        </div>
      </div>
      {sections.map((section) => (
        <section className="panel" key={section.kind}>
          <h2>{section.title}</h2>
          {section.result.error ? (
            <p className="feedback failure" role="alert">
              No pudimos cargar esta lista.
            </p>
          ) : (
            <ul className="compact-list">
              {section.result.data?.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          )}
          <details
            className="more-fields"
            open={!section.result.data?.length && section.kind !== "supplier"}
          >
            <summary>Agregar {section.label}</summary>
            <CatalogForm kind={section.kind} label={section.label} />
          </details>
        </section>
      ))}
    </>
  );
}
