import Link from "next/link";
import { AccessForm } from "@/components/forms";
import { Guide } from "@/components/guide";
import { isConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Access({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = isConfigured();
  const { error } = await searchParams;
  return (
    <main className="simple-page">
      <div className="simple-guide">
        <Guide />
      </div>
      <section className="simple-card">
        <h1>Hola, bienvenido</h1>
        <p>Ingresá al sistema de tu comercio.</p>
        {!configured && (
          <div className="setup-notice" role="status">
            <strong>Estamos preparando el acceso</strong>
            <p>Falta conectar la base de datos.</p>
            <Link prefetch={false} href="/preparacion">Ver pasos de habilitación</Link>
          </div>
        )}
        {error === "link" && (
          <p role="alert" className="feedback failure">
            El enlace no es válido o venció. Solicitá uno nuevo desde recuperar
            contraseña.
          </p>
        )}
        <AccessForm mode="login" configured={configured} />
        <p className="invite-note">
          ¿No tenés cuenta? Pedile una invitación al jefe.
        </p>
      </section>
    </main>
  );
}
