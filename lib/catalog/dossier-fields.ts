type CatalogDetail = { label: string; value: string };

export const dossierFields = [
  { id: "material", storedLabel: "جنس", label: "جنس", aliases: ["جنس فلز"], placeholder: "مثلاً نقره" },
  { id: "stone", storedLabel: "سنگ", label: "نوع سنگ", aliases: ["نوع سنگ"], placeholder: "نام سنگ یا بدون سنگ" },
  { id: "stoneColor", storedLabel: "رنگ سنگ", label: "رنگ سنگ", aliases: [], placeholder: "مثلاً آبی تیره" },
  { id: "weight", storedLabel: "وزن تقریبی", label: "وزن تقریبی", aliases: ["وزن", "وزن به گرم"], placeholder: "عدد و واحد؛ مثلاً ۳٫۲ گرم" },
  { id: "dimensions", storedLabel: "ابعاد تقریبی", label: "ابعاد تقریبی", aliases: ["ابعاد"], placeholder: "مثلاً ۱۲ × ۸ میلی‌متر" },
] as const;

export type DossierFieldId = (typeof dossierFields)[number]["id"];

function normalizeLabel(label: string) {
  return label.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\u200C\s]+/g, " ").trim();
}

function findField(label: string) {
  const normalized = normalizeLabel(label);
  return dossierFields.find((field) => [field.storedLabel, ...field.aliases].some((alias) => normalizeLabel(alias) === normalized));
}

export function isDossierField(label: string) {
  return Boolean(findField(label));
}

export function readDossierField(details: readonly CatalogDetail[], id: DossierFieldId) {
  return details.find((detail) => findField(detail.label)?.id === id && detail.value.trim())?.value ?? "";
}

export function updateDossierField(details: readonly CatalogDetail[], id: DossierFieldId, value: string): CatalogDetail[] {
  const field = dossierFields.find((item) => item.id === id)!;
  const first = details.findIndex((detail) => findField(detail.label)?.id === id);
  const next = details.filter((detail) => findField(detail.label)?.id !== id);
  if (value) next.splice(first < 0 ? next.length : first, 0, { label: field.storedLabel, value });
  return next;
}

export function displayDossierField(details: readonly CatalogDetail[], id: DossierFieldId) {
  const value = readDossierField(details, id).trim();
  return /^(?:جزئیات )?پس از/u.test(value) ? "پس از بررسی" : value;
}
