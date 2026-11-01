import type { ReactNode } from "react";
import type { ActionResult } from "@/lib/types";

export const initialResult: ActionResult = { ok: false, message: "" };

export function Feedback({ state }: { state: ActionResult }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`feedback ${state.ok ? "success" : "failure"}`}
    >
      {state.message}
    </p>
  );
}

export function Submit({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <button className="button primary" type="submit" disabled={pending}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function MoreFields({ children }: { children: ReactNode }) {
  return (
    <details className="more-fields">
      <summary>Más datos (opcional)</summary>
      <div className="form-stack">{children}</div>
    </details>
  );
}

export function PaymentMethod() {
  return (
    <label>
      Medio de pago
      <select name="payment_method" defaultValue="cash">
        <option value="cash">Efectivo</option>
        <option value="debit">Débito</option>
        <option value="credit">Crédito</option>
        <option value="transfer">Transferencia</option>
        <option value="other">Otro</option>
      </select>
    </label>
  );
}
