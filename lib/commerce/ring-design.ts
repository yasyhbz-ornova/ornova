export const RING_BAND_WIDTHS = [
  { label: "باریک" },
  { label: "متوسط" },
  { label: "پهن" },
] as const;

export type RingDesignSelection = {
  base: string;
  shape: string;
  color: string;
  colorClass: string;
  ornament: string;
  ringSizeEu: string;
};

export function parseRingDesignDraft(
  value: unknown,
  options: {
    shapes: readonly string[];
    colors: readonly (readonly [string, string])[];
    details: readonly string[];
  },
): RingDesignSelection | null {
  let draft: unknown = value;
  if (typeof value === "string") {
    try {
      draft = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!draft || typeof draft !== "object") return null;
  const selection = draft as Partial<RingDesignSelection>;
  const color = options.colors.find(([label]) => label === selection.color);
  if (
    !RING_BAND_WIDTHS.some(({ label }) => label === selection.base)
    || !options.shapes.includes(selection.shape ?? "")
    || !color
    || !options.details.includes(selection.ornament ?? "")
    || (selection.ringSizeEu !== undefined && (
      typeof selection.ringSizeEu !== "string"
      || selection.ringSizeEu.length > 8
      || !/^[0-9۰-۹٠-٩]*$/.test(selection.ringSizeEu)
    ))
  ) return null;

  return {
    base: selection.base!,
    shape: selection.shape!,
    color: color[0],
    colorClass: color[1],
    ornament: selection.ornament!,
    ringSizeEu: selection.ringSizeEu ?? "",
  };
}
