import { requireUser } from "@/lib/auth";
import { EmployeeForm, InviteForm, RevokeForm } from "@/components/forms";
import { dateTime } from "@/lib/format";
import type { Profile } from "@/lib/types";
export default async function Employees() {
  const { db } = await requireUser(true);
  const [{ data: profiles, error }, { data: invitations, error: inviteError }] =
    await Promise.all([
      db
        .from("profiles")
        .select(
          "id,business_id,auth_user_id,name,email,role,active,last_login_at",
        )
        .order("name")
        .limit(1000),
      db
        .from("employee_invitations")
        .select("id,name,email,status,expires_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCESOS Y PERMISOS</span>
          <h1>Empleados</h1>
          <p>Cada persona usa su cuenta. Su historial siempre se conserva.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Invitar a una persona</h2>
        <InviteForm />
      </section>
      {(error || inviteError) && (
        <p role="alert" className="feedback failure">
          No pudimos cargar todas las cuentas. Recargá la página.
        </p>
      )}
      <section className="panel">
        <h2>Equipo del comercio</h2>
        <div className="employee-list">
          {(profiles ?? []).map((p) => (
            <details className="employee-detail" key={p.id}>
              <summary>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.email}</small>
                </span>
                <span className={`pill ${!p.active ? "inactive" : ""}`}>
                  {p.active
                    ? p.role === "boss"
                      ? "Jefe"
                      : "Empleado"
                    : "Desactivado"}
                </span>
              </summary>
              <p className="muted">
                Último acceso:{" "}
                {p.last_login_at
                  ? dateTime(p.last_login_at)
                  : "Todavía no ingresó"}
              </p>
              <EmployeeForm profile={p as Profile} />
            </details>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Invitaciones pendientes</h2>
        {invitations?.length ? (
          invitations.map((i) => (
            <div className="invitation-row" key={i.id}>
              <div>
                <strong>{i.name}</strong>
                <p>{i.email}</p>
                <small>
                  {new Date(i.expires_at) < new Date() ? "Venció" : "Vence"}:{" "}
                  {dateTime(i.expires_at)}
                </small>
              </div>
              <RevokeForm id={i.id} />
            </div>
          ))
        ) : (
          <p className="empty-state">No hay invitaciones pendientes.</p>
        )}
      </section>
    </>
  );
}
