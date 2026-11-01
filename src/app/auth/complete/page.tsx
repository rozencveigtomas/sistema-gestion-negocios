"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseEmailFragment, type EmailSession } from "@/lib/auth-fragment";
import { completeEmailSession } from "@/app/actions/email-session";

export default function CompleteEmail() {
  const session = useRef<EmailSession | null>(null);
  const loaded = useRef(false);
  const [status, setStatus] = useState<
    "loading" | "ready" | "working" | "invalid"
  >("loading");
  useEffect(() => {
    function readFragment() {
      const fragment = window.location.hash;
      window.history.replaceState(null, "", "/auth/complete");
      session.current = parseEmailFragment(fragment);
      setStatus(session.current ? "ready" : "invalid");
    }
    if (!loaded.current) {
      loaded.current = true;
      readFragment();
    }
    window.addEventListener("hashchange", readFragment);
    return () => window.removeEventListener("hashchange", readFragment);
  }, []);
  async function confirm() {
    if (!session.current || status !== "ready") return;
    setStatus("working");
    try {
      const result = await completeEmailSession(session.current);
      session.current = null;
      window.location.replace(result.destination);
    } catch {
      session.current = null;
      setStatus("invalid");
    }
  }
  return (
    <main className="simple-page">
      <section className="simple-card">
        <span className="eyebrow">ACCESO PERSONAL</span>
        <h1>Confirmá tu acceso</h1>
        {status === "invalid" ? (
          <>
            <p role="alert">
              El enlace no es válido o venció. Solicitá uno nuevo.
            </p>
            <Link prefetch={false} href="/recuperar">Solicitar otro enlace</Link>
          </>
        ) : (
          <>
            <p>
              Continuá si abriste el correo de invitación o recuperación de tu
              propia cuenta.
            </p>
            <button
              className="button primary"
              disabled={status !== "ready"}
              onClick={confirm}
            >
              {status === "loading"
                ? "Verificando enlace…"
                : status === "working"
                  ? "Confirmando…"
                  : "Confirmar acceso"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
