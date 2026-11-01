"use client";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  cancelSale,
  createExpense,
  createOffer,
  createReturn,
  createSale,
  setOfferActive,
} from "@/app/actions/operations";
import type { Category, Product, SaleItem, Supplier } from "@/lib/types";
import { quantityMin, quantityStep } from "@/lib/quantities";
import { money } from "@/lib/format";
import {
  Feedback,
  initialResult,
  MoreFields,
  PaymentMethod,
  Submit,
} from "./form-ui";

export function SaleForm({
  products,
  idempotencyKey,
  selectedProductId = "",
}: {
  products: Product[];
  idempotencyKey: string;
  selectedProductId?: string;
}) {
  const [state, action, pending] = useActionState(createSale, initialResult);
  const [lines, setLines] = useState([
    { product_id: selectedProductId, quantity: "1" },
  ]);
  const items = lines.map((line) => ({
    product_id: line.product_id,
    quantity: Number(line.quantity),
  }));
  const total = lines.reduce(
    (sum, line) =>
      sum +
      Number(
        products.find((product) => product.id === line.product_id)
          ?.sale_price ?? 0,
      ) *
        Number(line.quantity || 0),
    0,
  );
  function update(index: number, change: Partial<(typeof lines)[number]>) {
    setLines((current) =>
      current.map((line, position) =>
        position === index ? { ...line, ...change } : line,
      ),
    );
  }

  if (state.ok)
    return (
      <div className="form-stack">
        <Feedback state={state} />
        <a className="button primary" href="/ventas">
          Nueva venta
        </a>
      </div>
    );

  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="line-editor">
        {lines.map((line, index) => {
          const product = products.find((item) => item.id === line.product_id);
          return (
            <div className="line-row" key={index}>
              <label>
                Producto
                <select
                  value={line.product_id}
                  onChange={(event) =>
                    update(index, { product_id: event.target.value })
                  }
                  required
                >
                  <option value="" disabled>
                    Seleccionar
                  </option>
                  {products.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={
                        Number(item.current_stock) <= 0 ||
                        lines.some(
                          (other, position) =>
                            position !== index && other.product_id === item.id,
                        )
                      }
                    >
                      {item.name} · {item.internal_identifier} · stock{" "}
                      {Number(item.current_stock).toLocaleString("es-AR")}{" "}
                      {item.unit_of_measure}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad
                <input
                  type="number"
                  min={quantityMin(product?.unit_of_measure)}
                  max={product ? Number(product.current_stock) : undefined}
                  step={quantityStep(product?.unit_of_measure)}
                  value={line.quantity}
                  onChange={(event) =>
                    update(index, { quantity: event.target.value })
                  }
                  required
                />
              </label>
              {lines.length > 1 && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Quitar artículo ${index + 1}`}
                  onClick={() =>
                    setLines(lines.filter((_, position) => position !== index))
                  }
                >
                  <Trash2 size={19} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="button secondary"
        disabled={lines.length >= Math.min(products.length, 100)}
        onClick={() => setLines([...lines, { product_id: "", quantity: "1" }])}
      >
        <Plus size={17} />
        Agregar producto
      </button>
      <PaymentMethod />
      <MoreFields>
        <label>
          Cliente
          <input name="client_name" maxLength={150} />
        </label>
      </MoreFields>
      <p className="sale-total">
        Total antes de ofertas: <strong>{money(total)}</strong>
      </p>
      <Feedback state={state} />
      <Submit pending={pending}>Confirmar venta</Submit>
    </form>
  );
}

export function ExpenseForm({ suppliers }: { suppliers: Supplier[] }) {
  const [state, action, pending] = useActionState(createExpense, initialResult);
  return (
    <form action={action} className="form-stack">
      <div className="form-grid">
        <label>
          Concepto
          <input name="concept" required minLength={2} maxLength={160} />
        </label>
        <label>
          Importe
          <input name="amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Categoría
          <input
            name="category"
            required
            minLength={2}
            maxLength={80}
            placeholder="Servicios, alquiler…"
          />
        </label>
        <PaymentMethod />
      </div>
      <MoreFields>
        <div className="form-grid">
          <label>
            Proveedor
            <select name="supplier_id" defaultValue="">
              <option value="">Sin proveedor</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select name="status" defaultValue="paid">
              <option value="paid">Pagado</option>
              <option value="pending">Pendiente</option>
            </select>
          </label>
          <label>
            Fecha y hora
            <input name="occurred_at" type="datetime-local" />
          </label>
          <label>
            Comprobante
            <input name="receipt_reference" maxLength={160} />
          </label>
        </div>
        <label>
          Observación
          <textarea name="notes" maxLength={2000} />
        </label>
      </MoreFields>
      <Feedback state={state} />
      <Submit pending={pending}>Guardar gasto</Submit>
    </form>
  );
}

export function ReturnForm({
  items,
  idempotencyKey,
  boss,
}: {
  items: SaleItem[];
  idempotencyKey: string;
  boss: boolean;
}) {
  const [state, action, pending] = useActionState(createReturn, initialResult);
  const [selectedId, setSelectedId] = useState("");
  const selected = items.find((item) => item.id === selectedId);
  if (state.ok)
    return (
      <div className="form-stack">
        <Feedback state={state} />
        <a className="button primary" href="/devoluciones">
          Nueva devolución
        </a>
      </div>
    );
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <label>
        Artículo vendido
        <select
          name="sale_item_id"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          required
        >
          <option value="" disabled>
            Seleccionar
          </option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.products?.name ?? "Producto"} ·{" "}
              {item.products?.internal_identifier} ·{" "}
              {money(Number(item.final_unit_price))} · venta{" "}
              {item.sale_id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Cantidad
          <input
            name="quantity"
            type="number"
            min={quantityMin(selected?.products?.unit_of_measure)}
            max={selected ? Number(selected.quantity) : undefined}
            step={quantityStep(selected?.products?.unit_of_measure)}
            required
          />
        </label>
        <label>
          Dinero a devolver
          <input
            name="refund_amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            required
          />
        </label>
        <label>
          Estado del producto
          <select name="disposition" defaultValue="reenter">
            <option value="reenter">Vuelve al stock</option>
            <option value="pending_review">Pendiente de revisión</option>
            {boss && <option value="non_sellable">No se puede vender</option>}
          </select>
        </label>
        <label>
          Motivo
          <input name="reason" required minLength={2} maxLength={160} />
        </label>
      </div>
      <MoreFields>
        <label>
          Fecha y hora
          <input name="occurred_at" type="datetime-local" />
        </label>
        <label>
          Observación
          <textarea name="notes" maxLength={2000} />
        </label>
      </MoreFields>
      <Feedback state={state} />
      <Submit pending={pending}>Registrar devolución</Submit>
    </form>
  );
}

export function OfferForm({
  products,
  categories,
  today,
}: {
  products: Product[];
  categories: Category[];
  today: string;
}) {
  const [state, action, pending] = useActionState(createOffer, initialResult);
  const [scope, setScope] = useState<"product" | "category">("product");
  const options = scope === "product" ? products : categories;
  return (
    <form action={action} className="form-stack">
      <div className="form-grid">
        <label>
          Nombre
          <input name="name" required minLength={2} maxLength={120} />
        </label>
        <label>
          Aplicar a
          <select
            name="scope"
            value={scope}
            onChange={(event) =>
              setScope(event.target.value as "product" | "category")
            }
          >
            <option value="product">Un producto</option>
            <option value="category">Una categoría</option>
          </select>
        </label>
        <label>
          {scope === "product" ? "Producto" : "Categoría"}
          <select
            key={scope}
            name={scope === "product" ? "product_id" : "category_id"}
            required
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar
            </option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <input
          type="hidden"
          name={scope === "product" ? "category_id" : "product_id"}
          value=""
        />
        <input type="hidden" name="discount_type" value="percent" />
        <label>
          Descuento (%)
          <input
            name="value"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            required
          />
        </label>
        <label>
          Comienza
          <input
            name="starts_at"
            type="datetime-local"
            defaultValue={`${today}T00:00`}
            required
          />
        </label>
        <label>
          Termina
          <input name="ends_at" type="datetime-local" required />
        </label>
      </div>
      <p className="note">
        Se aplica al vender. Si coinciden varias ofertas, se usa la que más baja
        el precio.
      </p>
      <Feedback state={state} />
      <Submit pending={pending}>Crear oferta</Submit>
    </form>
  );
}

export function OfferToggle({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(
    setOfferActive,
    initialResult,
  );
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!active)} />
      <button className="button secondary" disabled={pending}>
        {active ? "Desactivar" : "Activar"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function CancelSaleForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(cancelSale, initialResult);
  return (
    <details className="more-fields">
      <summary>Cancelar venta</summary>
      <form
        action={action}
        className="form-stack"
        onSubmit={(event) => {
          if (
            !window.confirm(
              "¿Cancelar esta venta y devolver los productos al stock?",
            )
          )
            event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <label>
          Motivo
          <input name="reason" required minLength={3} maxLength={500} />
        </label>
        <Submit pending={pending}>Confirmar cancelación</Submit>
        <Feedback state={state} />
      </form>
    </details>
  );
}
