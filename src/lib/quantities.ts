/** Units that represent countable pieces rather than a measured amount. */
export const DISCRETE_UNITS = ["unidad", "caja", "paquete"] as const;

export function isDiscreteUnit(unit: string | null | undefined): boolean {
  return Boolean(unit && (DISCRETE_UNITS as readonly string[]).includes(unit));
}

export function quantityStep(unit: string | null | undefined): string {
  return isDiscreteUnit(unit) ? "1" : "0.001";
}

export function quantityMin(unit: string | null | undefined): string {
  return isDiscreteUnit(unit) ? "1" : "0.001";
}

/** Normalize the comma-separated color representation used by the product form. */
export function normalizeColorList(value: string): string {
  const colors: string[] = [];
  for (const raw of value.split(/[;,\n]+/)) {
    const color = raw.trim().replace(/\s+/g, " ");
    if (
      color &&
      !colors.some(
        (existing) =>
          existing.toLocaleLowerCase() === color.toLocaleLowerCase(),
      )
    ) {
      colors.push(color);
    }
  }
  return colors.join(", ");
}

export function splitColors(value: string | null | undefined): string[] {
  if (!value) return [];
  return normalizeColorList(value).split(", ").filter(Boolean);
}
