"use client";
import type { ChangeEvent } from "react";
import { Search } from "lucide-react";

type ProductFiltersProps = {
  query: string;
  low: boolean;
  archived: boolean;
  showArchived: boolean;
};

export function ProductFilters({
  query,
  low,
  archived,
  showArchived,
}: ProductFiltersProps) {
  const onChange = (event: ChangeEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox")
      event.currentTarget.requestSubmit();
  };
  return (
    <form
      className="filter-bar"
      method="get"
      action="/productos"
      onChange={onChange}
    >
      <label>
        <span className="sr-only">Buscar productos</span>
        <span className="search-input">
          <Search size={18} />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o SKU"
          />
        </span>
      </label>
      <label className="check-label">
        <input type="checkbox" name="low" value="1" defaultChecked={low} />{" "}
        Stock bajo
      </label>
      {showArchived && (
        <label className="check-label">
          <input
            type="checkbox"
            name="archived"
            value="1"
            defaultChecked={archived}
          />{" "}
          Ver archivados
        </label>
      )}
      <button type="submit" className="button secondary">
        Buscar
      </button>
    </form>
  );
}
