/** Mirrors FeeSettings.buyerCollectionFee on the server (the server's figure is what is charged):
 *  percent of the amount (to the kobo, half-up) plus the fixed part, capped when a cap is set. */
export interface CollectionFeeConfig {
  buyerCollectionPercent: number;
  buyerCollectionFixed: number;
  buyerCollectionCap: number;
}

export function collectionFeeFor(amount: number, fees: CollectionFeeConfig | null | undefined): number {
  if (!fees || amount <= 0) return 0;
  const kobo = Math.round(amount * 100 * fees.buyerCollectionPercent / 100) + Math.round(fees.buyerCollectionFixed * 100);
  const capped = fees.buyerCollectionCap > 0 ? Math.min(kobo, Math.round(fees.buyerCollectionCap * 100)) : kobo;
  return Math.max(0, capped) / 100;
}
