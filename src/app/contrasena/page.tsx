import { redirect } from "next/navigation";
import { AccessForm } from "@/components/forms";
import { Guide } from "@/components/guide";
import { supabase, isConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Password() {
  if (!isConfigured()) redirect("/acceso");
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (!user || error) redirect("/recuperar");
  return (
    <main className="simple-page">
      <div className="simple-guide">
        <Guide />
      </div>
      <section className="simple-card">
        <span className="eyebrow">ACCESO PERSONAL</span>
        <h1>Elegí tu contraseña</h1>
        <p>Tu cuenta: {user.email}</p>
        <AccessForm mode="password" configured />
      </section>
    </main>
  );
}
