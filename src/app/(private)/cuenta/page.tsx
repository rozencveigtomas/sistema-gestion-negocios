import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dateTime } from "@/lib/format";
export default async function Account() {
  const { profile } = await requireUser();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCESO PERSONAL</span>
          <h1>Mi cuenta</h1>
        </div>
      </div>
      <section className="panel">
        <h2>{profile.name}</h2>
        <dl className="data-list">
          <div>
            <dt>Correo</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>Permisos</dt>
            <dd>{profile.role === "boss" ? "Jefe" : "Empleado"}</dd>
          </div>
          <div>
            <dt>Último acceso</dt>
            <dd>
              {profile.last_login_at
                ? dateTime(profile.last_login_at)
                : "Sin registro"}
            </dd>
          </div>
        </dl>
        <Link prefetch={false} href="/contrasena" className="button primary">
          Cambiar contraseña
        </Link>
      </section>
    </>
  );
}
