import { logout } from "@/app/actions/auth";
export default function Denied() {
  return (
    <main className="simple-page">
      <section className="simple-card">
        <span className="eyebrow">CUENTA SIN ACCESO</span>
        <h1>Necesitás una cuenta habilitada</h1>
        <p>
          Contactá al jefe de tu comercio para revisar tu invitación o el estado
          de tu cuenta.
        </p>
        <form action={logout}>
          <button className="button primary">Cerrar sesión y volver</button>
        </form>
      </section>
    </main>
  );
}
