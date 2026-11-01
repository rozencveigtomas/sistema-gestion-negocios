import Link from "next/link";
import { Guide } from "@/components/guide";
import { isConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function Preparation() {
  if (isConfigured()) redirect("/acceso");
  return (
    <main className="simple-page">
      <div className="simple-guide">
        <Guide />
      </div>
      <section className="simple-card wide-card">
        <span className="eyebrow">PRIMERA HABILITACIÓN</span>
        <h1>Conectemos tu comercio</h1>
        <p>
          La aplicación necesita un proyecto de Supabase para guardar
          información y administrar el acceso.
        </p>
        <ol className="steps">
          <li>
            <strong>Crear el proyecto</strong>
            <p>
              Desde Supabase, creá un proyecto dedicado a esta aplicación.
              Conservá su contraseña de base de datos en un lugar seguro.
            </p>
          </li>
          <li>
            <strong>Conectar y aplicar la migración</strong>
            <p>
              El responsable técnico carga las claves en el entorno privado y
              ejecuta la migración incluida en el proyecto.
            </p>
          </li>
          <li>
            <strong>Habilitar al primer jefe</strong>
            <p>
              Definí el correo y nombre del administrador. Recibirá un enlace
              para elegir su contraseña.
            </p>
          </li>
          <li>
            <strong>Verificar el acceso</strong>
            <p>
              Probamos invitaciones, recuperación por correo y separación entre
              comercios antes de seguir con inventario.
            </p>
          </li>
        </ol>
        <p className="note">
          El manual técnico y la lista de pruebas están incluidos en la carpeta
          del proyecto. No compartas claves privadas por chat.
        </p>
        <Link prefetch={false} href="/acceso" className="button primary">
          Volver al acceso
        </Link>
      </section>
    </main>
  );
}
