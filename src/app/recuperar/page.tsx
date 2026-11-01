import { AccessForm } from "@/components/forms";
import { Guide } from "@/components/guide";
import { isConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default function Recover() {
  return (
    <main className="simple-page">
      <div className="simple-guide">
        <Guide />
      </div>
      <section className="simple-card">
        <span className="eyebrow">TU CUENTA</span>
        <h1>Recuperar contraseña</h1>
        <p>Te enviaremos un enlace temporal al correo de tu cuenta.</p>
        {!isConfigured() && (
          <p className="feedback failure">
            El servicio de acceso todavía no está configurado.
          </p>
        )}
        <AccessForm mode="recovery" configured={isConfigured()} />
      </section>
    </main>
  );
}
