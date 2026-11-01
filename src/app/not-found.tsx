import Link from "next/link";
export default function NotFound() {
  return (
    <main className="simple-page">
      <section className="simple-card">
        <h1>No encontramos esa pantalla</h1>
        <p>Revisá la dirección o volvé al inicio.</p>
        <Link prefetch={false} className="button primary" href="/inicio">
          Ir al inicio
        </Link>
      </section>
    </main>
  );
}
