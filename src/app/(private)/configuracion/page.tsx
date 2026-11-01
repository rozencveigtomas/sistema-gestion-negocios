import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BusinessForm } from "@/components/forms";

export default async function Settings() {
  const { business } = await requireUser(true);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Administración</h1>
          <p>Accesos y datos del comercio.</p>
        </div>
      </div>
      <Link prefetch={false} className="panel task-link" href="/empleados">
        <h2>Empleados</h2>
        <p>Invitar personas y administrar sus permisos.</p>
      </Link>
      <section className="panel">
        <h2>Datos del comercio</h2>
        <BusinessForm business={business} />
      </section>
    </>
  );
}
