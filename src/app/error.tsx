"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="simple-page">
      <section className="simple-card">
        <h1>No pudimos cargar esta pantalla</h1>
        <p>
          Revisá tu conexión y volvé a intentarlo. Si continúa, contactá al
          responsable del comercio.
        </p>
        <button className="button primary" onClick={reset}>
          Intentar de nuevo
        </button>
      </section>
    </main>
  );
}
