"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { login, recover, changePassword } from "@/app/actions/auth";
import {
  saveBusiness,
  saveEmployee,
  inviteEmployee,
  revokeInvitation,
} from "@/app/actions/business";
import type { Business, Profile } from "@/lib/types";
import { Feedback, initialResult, MoreFields, Submit } from "./form-ui";

export function AccessForm({
  mode,
  configured,
}: {
  mode: "login" | "recovery" | "password";
  configured: boolean;
}) {
  const action =
    mode === "login" ? login : mode === "recovery" ? recover : changePassword;
  const [state, formAction, pending] = useActionState(action, initialResult);
  const [visible, setVisible] = useState(false);
  return (
    <form action={formAction} className="form-stack">
      {mode !== "password" && (
        <label>
          Correo electrónico
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={!configured}
          />
        </label>
      )}
      {mode !== "recovery" && (
        <label>
          {mode === "password" ? "Nueva contraseña" : "Contraseña"}
          <span className="password-field">
            <input
              name="password"
              aria-label={
                mode === "password" ? "Nueva contraseña" : "Contraseña"
              }
              type={visible ? "text" : "password"}
              autoComplete={
                mode === "password" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "password" ? 12 : 1}
              maxLength={128}
              disabled={!configured}
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={visible}
            >
              {visible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </span>
          {mode === "password" && <small>Al menos 12 caracteres.</small>}
        </label>
      )}
      {mode === "password" && (
        <label>
          Repetí la nueva contraseña
          <input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
      )}
      <Feedback state={state} />
      <button
        type="submit"
        className="button primary wide"
        disabled={pending || !configured}
      >
        {pending
          ? "Procesando…"
          : mode === "login"
            ? "Ingresar al comercio"
            : mode === "recovery"
              ? "Enviar enlace"
              : "Guardar contraseña"}
      </button>
      <Link prefetch={false}
        className="center-link"
        href={
          mode === "login"
            ? "/recuperar"
            : mode === "password"
              ? "/inicio"
              : "/acceso"
        }
      >
        {mode === "login"
          ? "Olvidé mi contraseña"
          : mode === "password"
            ? "Ir al comercio"
            : "Volver al acceso"}
      </Link>
    </form>
  );
}

export function BusinessForm({ business }: { business: Business }) {
  const [state, action, pending] = useActionState(saveBusiness, initialResult);
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="service_name" value={business.service_name} />
      <input type="hidden" name="brand_color" value={business.brand_color} />
      <label>
        Nombre del comercio
        <input
          name="name"
          defaultValue={business.name}
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label>
        Correo de soporte <small>Opcional</small>
        <input
          name="support_email"
          type="email"
          defaultValue={business.support_email ?? ""}
          maxLength={254}
        />
      </label>
      <MoreFields>
        <label>
          CUIT / identificador fiscal
          <input
            name="tax_identifier"
            defaultValue={business.tax_identifier ?? ""}
            maxLength={30}
          />
        </label>
      </MoreFields>
      <Feedback state={state} />
      <Submit pending={pending}>Guardar cambios</Submit>
    </form>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(
    inviteEmployee,
    initialResult,
  );
  return (
    <form action={action} className="form-stack">
      <div className="form-grid">
        <label>
          Nombre
          <input name="name" required minLength={2} maxLength={100} />
        </label>
        <label>
          Correo
          <input name="email" type="email" required maxLength={254} />
        </label>
      </div>
      <Feedback state={state} />
      <Submit pending={pending}>Invitar empleado</Submit>
    </form>
  );
}

export function EmployeeForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveEmployee, initialResult);
  return (
    <form
      action={action}
      className="form-stack"
      onSubmit={(event) => {
        if (!window.confirm("¿Guardar estos permisos de acceso?"))
          event.preventDefault();
      }}
    >
      <input name="id" value={profile.id} type="hidden" />
      <div className="form-grid">
        <label>
          Nombre
          <input
            name="name"
            defaultValue={profile.name}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          Permisos
          <select name="role" defaultValue={profile.role}>
            <option value="employee">Empleado</option>
            <option value="boss">Jefe</option>
          </select>
        </label>
      </div>
      <label className="check-label">
        <input type="checkbox" name="active" defaultChecked={profile.active} />
        Cuenta activa
      </label>
      <Feedback state={state} />
      <Submit pending={pending}>Guardar permisos</Submit>
    </form>
  );
}

export function RevokeForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    revokeInvitation,
    initialResult,
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("¿Revocar esta invitación?"))
          event.preventDefault();
      }}
    >
      <input name="id" type="hidden" value={id} />
      <button className="button secondary" disabled={pending}>
        Revocar invitación
      </button>
      <Feedback state={state} />
    </form>
  );
}
