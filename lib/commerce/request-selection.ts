import type { RequestItem } from "./request-basket";

export type ProductRequestContext = Omit<RequestItem, "quantity">;

export function getInquiryItems(
  basketItems: RequestItem[],
  productContext?: ProductRequestContext,
  requestBasketContext = false,
  selectedKey?: string,
): RequestItem[] {
  if (requestBasketContext) {
    if (!productContext || basketItems.some((item) => item.slug === productContext.slug)) return basketItems;
    return [...basketItems, { ...productContext, quantity: 1 }];
  }

  if (!productContext) return [];
  const selectedProducts = basketItems.filter((item) => item.slug === productContext.slug && (!selectedKey || (item.lineId ?? item.slug) === selectedKey));
  return selectedProducts.length || selectedKey ? selectedProducts : [{ ...productContext, quantity: 1 }];
}

export function removeSubmittedRequestItems(basketItems: RequestItem[], submittedItems: RequestItem[]): RequestItem[] {
  return basketItems.flatMap((item) => {
    const submittedQuantity = submittedItems.reduce((sum, submitted) => {
      const fields = ["ring_size_eu", "stone_note", "dimensions_note", "finish_note"] as const;
      const samePreferences = fields.every((key) => item.preferences?.[key] === submitted.preferences?.[key]);
      const sameNote = (item.note ?? "").trim() === (submitted.note ?? "").trim();
      return (submitted.lineId ?? submitted.slug) === (item.lineId ?? item.slug) && submitted.slug === item.slug && samePreferences && sameNote ? sum + submitted.quantity : sum;
    }, 0);
    const remainingQuantity = item.quantity - submittedQuantity;
    return remainingQuantity > 0 ? [{ ...item, quantity: remainingQuantity }] : [];
  });
}
