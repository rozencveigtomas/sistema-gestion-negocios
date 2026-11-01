"use client";
import { useActionState, useState } from "react";
import {
  createInventorySession,
  decideInventorySession,
  recordInventoryCount,
  startInventorySession,
  submitInventorySession,
} from "@/app/actions/physical";
import type { InventoryCountItem, Product } from "@/lib/types";
import { quantityStep } from "@/lib/quantities";
import { Feedback, initialResult, Submit } from "./form-ui";

export function InventorySessionForm({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [state, action, pending] = useActionState(
    createInventorySession,
    initialResult,
  );
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  return (
    <form action={action} className="form-stack">
      <label>
        Nombre del conteo
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          placeholder="Conteo de cierre"
        />
      </label>
      <fieldset className="check-fieldset">
        <legend>Productos a contar · hasta 100</legend>
        <div className="button-row">
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              setSelected(products.slice(0, 100).map((product) => product.id))
            }
          >
            Seleccionar hasta 100
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => setSelected([])}
          >
            Limpiar
          </button>
        </div>
        <div className="checkbox-grid">
          {products.map((product) => (
            <label className="check-option" key={product.id}>
              <input
                type="checkbox"
                checked={selected.includes(product.id)}
                disabled={
                  !selected.includes(product.id) && selected.length >= 100
                }
                onChange={() => toggle(product.id)}
              />
              <span>
                {product.name}
                <small>{product.internal_identifier}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="note">
        Las ventas del comercio se pausan mientras se cuentan los productos. Al
        terminar el conteo, el jefe revisa las diferencias.
      </p>
      <input
        type="hidden"
        name="product_ids"
        value={JSON.stringify(selected)}
      />
      <Feedback state={state} />
      <Submit pending={pending}>Iniciar conteo</Submit>
    </form>
  );
}

export function StartSessionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    startInventorySession,
    initialResult,
  );
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Submit pending={pending}>Iniciar conteo</Submit>
      <Feedback state={state} />
    </form>
  );
}

export function SubmitSessionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    submitInventorySession,
    initialResult,
  );
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Submit pending={pending}>Terminar y revisar</Submit>
      <Feedback state={state} />
    </form>
  );
}

export function DecisionForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    decideInventorySession,
    initialResult,
  );
  return (
    <form
      action={action}
      className="form-stack"
      onSubmit={(event) => {
        const button = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        if (
          button?.value === "true" &&
          !window.confirm("¿Actualizar el stock con las cantidades contadas?")
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <div className="button-row">
        <button
          className="button secondary"
          name="approve"
          value="false"
          disabled={pending}
        >
          Pedir recuento
        </button>
        <button
          className="button primary"
          name="approve"
          value="true"
          disabled={pending}
        >
          Aprobar stock
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function CountForm({
  item,
  sessionId,
}: {
  item: InventoryCountItem;
  sessionId: string;
}) {
  const [state, action, pending] = useActionState(
    recordInventoryCount,
    initialResult,
  );
  return (
    <form action={action} className="count-form">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="product_id" value={item.product_id} />
      <div className="count-product">
        <strong>{item.products?.name ?? "Producto"}</strong>
        <small>{item.products?.internal_identifier}</small>
      </div>
      <div className="count-expected">
        <span>Registrado</span>
        <strong>{Number(item.expected_stock).toLocaleString("es-AR")}</strong>
      </div>
      <label>
        Cantidad contada
        <input
          name="first_count"
          type="number"
          min="0"
          step={quantityStep(item.products?.unit_of_measure)}
          required
          defaultValue={
            item.final_count === null ? "" : String(item.final_count)
          }
        />
      </label>
      <Submit pending={pending}>Guardar conteo</Submit>
      <Feedback state={state} />
    </form>
  );
}
