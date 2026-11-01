"use client";
import { useActionState, useState } from "react";
import {
  createCatalogItem,
  createProduct,
  adjustStock,
  setProductActive,
} from "@/app/actions/inventory";
import type { Category, Location, Supplier } from "@/lib/types";
import {
  normalizeColorList,
  quantityMin,
  quantityStep,
} from "@/lib/quantities";
import { Feedback, initialResult, MoreFields, Submit } from "./form-ui";

const COLORS = [
  "Negro",
  "Blanco",
  "Rojo",
  "Azul",
  "Verde",
  "Amarillo",
  "Naranja",
  "Rosa",
  "Violeta",
  "Marrón",
  "Gris",
  "Beige",
  "Celeste",
  "Bordó",
  "Dorado",
  "Plateado",
  "Multicolor",
];
const SIZES = [
  "Único",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "50",
];

export function CatalogForm({
  kind,
  label,
}: {
  kind: "category" | "location" | "supplier";
  label: string;
}) {
  const [state, action, pending] = useActionState(
    createCatalogItem,
    initialResult,
  );
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="kind" value={kind} />
      <label>
        Nombre
        <input name="name" required minLength={2} maxLength={100} />
      </label>
      <Feedback state={state} />
      <Submit pending={pending}>Agregar {label}</Submit>
    </form>
  );
}

function ColorEditor() {
  const [colors, setColors] = useState<string[]>([]);
  const [custom, setCustom] = useState<string | null>(null);
  const [error, setError] = useState("");
  function add(value: string) {
    const next = normalizeColorList([...colors, value].join(", "));
    if (next.length > 80) {
      setError("La lista de colores admite hasta 80 caracteres.");
      return;
    }
    setColors(next ? next.split(", ") : []);
    setCustom(null);
    setError("");
  }
  return (
    <fieldset className="option-field">
      <legend>
        Color <small>Opcional</small>
      </legend>
      <input type="hidden" name="color" value={colors.join(", ")} />
      <select
        aria-label="Seleccionar color"
        value={custom === null ? "" : "custom"}
        onChange={(event) =>
          event.target.value === "custom"
            ? setCustom("")
            : add(event.target.value)
        }
      >
        <option value="" disabled>
          Seleccionar color
        </option>
        {COLORS.map((color) => (
          <option key={color}>{color}</option>
        ))}
        <option value="custom">Otro color</option>
      </select>
      {custom !== null && (
        <div className="color-input-row">
          <input
            aria-label="Otro color"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            maxLength={80}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add(custom);
              }
            }}
          />
          <button
            type="button"
            className="button secondary"
            disabled={!custom.trim()}
            onClick={() => add(custom)}
          >
            Agregar
          </button>
        </div>
      )}
      {colors.length > 0 && (
        <div className="tag-list">
          {colors.map((color) => (
            <span className="tag-chip" key={color}>
              {color}
              <button
                type="button"
                className="tag-remove"
                aria-label={`Quitar color ${color}`}
                onClick={() =>
                  setColors(colors.filter((value) => value !== color))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="feedback failure">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function SizeEditor() {
  const [preset, setPreset] = useState("");
  const [custom, setCustom] = useState("");
  return (
    <fieldset className="option-field">
      <legend>
        Talle o tamaño <small>Opcional</small>
      </legend>
      <select
        aria-label="Talle o tamaño"
        value={preset}
        onChange={(event) => setPreset(event.target.value)}
      >
        <option value="">Sin talle o tamaño</option>
        {SIZES.map((size) => (
          <option key={size}>{size}</option>
        ))}
        <option value="custom">Otro</option>
      </select>
      {preset === "custom" && (
        <input
          aria-label="Talle o tamaño personalizado"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          maxLength={80}
          placeholder="Ej. 2 años"
        />
      )}
      <input
        type="hidden"
        name="size"
        value={preset === "custom" ? custom : preset}
      />
    </fieldset>
  );
}

export function ProductForm({
  categories,
  locations,
  suppliers,
}: {
  categories: Category[];
  locations: Location[];
  suppliers: Supplier[];
}) {
  const [state, action, pending] = useActionState(createProduct, initialResult);
  const [unit, setUnit] = useState("unidad");
  return (
    <form action={action} className="form-stack">
      <div className="form-grid">
        <label>
          Nombre
          <input name="name" required minLength={2} maxLength={150} />
        </label>
        <label>
          SKU / identificador
          <input name="internal_identifier" required maxLength={80} />
          <small>Código propio del producto.</small>
        </label>
        <label>
          Categoría
          <select
            name="category_id"
            required
            defaultValue={categories.length === 1 ? categories[0].id : ""}
          >
            <option value="" disabled>
              Seleccionar
            </option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {locations.length === 1 ? (
          <input type="hidden" name="location_id" value={locations[0].id} />
        ) : (
          <label>
            Ubicación
            <select name="location_id" required defaultValue="">
              <option value="" disabled>
                Seleccionar
              </option>
              {locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Costo unitario
          <input name="cost_price" type="number" min="0" step="0.01" required />
        </label>
        <label>
          Precio de venta
          <input name="sale_price" type="number" min="0" step="0.01" required />
        </label>
        <label>
          Stock inicial
          <input
            name="initial_stock"
            type="number"
            min="0"
            step={quantityStep(unit)}
            required
            defaultValue="0"
          />
        </label>
        <label>
          Unidad
          <select
            name="unit_of_measure"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          >
            {["unidad", "kg", "g", "l", "ml", "m", "cm", "caja", "paquete"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <ColorEditor />
        <SizeEditor />
      </div>
      <MoreFields>
        <div className="form-grid">
          <label>
            Marca
            <input name="brand" maxLength={100} />
          </label>
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
            Vencimiento
            <input name="expiration_date" type="date" />
          </label>
        </div>
        <label>
          Descripción
          <textarea name="description" maxLength={2000} />
        </label>
        <label>
          Notas internas
          <textarea name="internal_notes" maxLength={3000} />
        </label>
      </MoreFields>
      <Feedback state={state} />
      <Submit pending={pending}>Crear producto</Submit>
    </form>
  );
}

const stockOperations = [
  { label: "Compra: sumar stock", type: "entry", reason: "purchase" },
  { label: "Daño: restar stock", type: "exit", reason: "damage" },
  {
    label: "Uso del comercio: restar stock",
    type: "exit",
    reason: "internal_use",
  },
  { label: "Corrección: sumar stock", type: "entry", reason: "correction" },
  { label: "Corrección: restar stock", type: "exit", reason: "correction" },
];

export function MovementForm({
  productId,
  boss,
  unitOfMeasure,
}: {
  productId: string;
  boss: boolean;
  unitOfMeasure?: string;
}) {
  const [state, action, pending] = useActionState(adjustStock, initialResult);
  const [operation, setOperation] = useState(0);
  const selected = stockOperations[operation];
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="movement_type" value={selected.type} />
      <input type="hidden" name="reason" value={selected.reason} />
      <label>
        Operación
        <select
          value={operation}
          onChange={(event) => setOperation(Number(event.target.value))}
        >
          {stockOperations.map(
            (item, index) =>
              (boss || item.reason !== "correction") && (
                <option key={index} value={index}>
                  {item.label}
                </option>
              ),
          )}
        </select>
      </label>
      <label>
        Cantidad
        <input
          name="quantity"
          type="number"
          min={quantityMin(unitOfMeasure)}
          step={quantityStep(unitOfMeasure)}
          required
        />
      </label>
      <Feedback state={state} />
      <Submit pending={pending}>Guardar stock</Submit>
    </form>
  );
}

export function ProductStatusForm({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState(
    setProductActive,
    initialResult,
  );
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!active)} />
      <button className="button secondary" disabled={pending}>
        {active ? "Archivar producto" : "Reactivar producto"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
