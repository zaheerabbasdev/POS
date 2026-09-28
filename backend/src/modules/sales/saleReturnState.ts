import type { Prisma } from "../../generated/prisma/client.js";
import { MONEY_EPSILON } from "../../common/utils/money.js";

/**
 * Shared by Sales Returns and Cancel Sale so both agree on exactly which
 * units of a sale are still with the customer, and what each one is worth.
 *
 * - IMEI-tracked lines (one phone per line) are "still with the customer"
 *   only while that IMEI is still linked to this sale — a return releases
 *   it (saleId → null), and it may later be resold to someone else, so the
 *   IMEI's own current saleId is the source of truth, not a quantity count.
 * - Plain-quantity lines have no per-line return record (SalesReturnItem is
 *   per product), so the product's total returned quantity is consumed
 *   across its lines in a fixed order (sorted by line id) — the same order
 *   every time, so repeated returns never double-count the same line.
 */
export interface SaleLineForReturn {
  id: string;
  productId: string;
  quantity: number;
  lineTotal: Prisma.Decimal;
  imeiId: string | null;
  imeiNumber: { id: string; imeiNumber: string; saleId: string | null } | null;
}

export function computeHeldQuantities(
  saleId: string,
  lines: SaleLineForReturn[],
  returnedByProduct: Map<string, number>,
): Map<string, number> {
  const held = new Map<string, number>();
  const remainingReturned = new Map(returnedByProduct);

  for (const line of [...lines].sort((a, b) => a.id.localeCompare(b.id))) {
    if (line.imeiId) {
      held.set(line.id, line.imeiNumber?.saleId === saleId ? line.quantity : 0);
      continue;
    }
    const returned = remainingReturned.get(line.productId) ?? 0;
    const consumed = Math.min(returned, line.quantity);
    remainingReturned.set(line.productId, returned - consumed);
    held.set(line.id, line.quantity - consumed);
  }

  return held;
}

/**
 * What one unit of each line actually cost the customer: the line's own
 * net total (after its line discount/tax) spread per unit, then scaled by
 * the invoice-level discount (sale.totalAmount / sum of line totals). A
 * phone listed at 50,000 with a 5,000 discount is worth 45,000 here — so a
 * refund never pays back more than the customer was charged.
 */
export function computeUnitValues(
  lines: SaleLineForReturn[],
  saleTotalAmount: Prisma.Decimal | number,
): Map<string, number> {
  const sumLineTotals = lines.reduce((sum, line) => sum + Number(line.lineTotal), 0);
  const factor = sumLineTotals > 0 ? Number(saleTotalAmount) / sumLineTotals : 0;
  return new Map(
    lines.map((line) => [line.id, line.quantity > 0 ? (Number(line.lineTotal) / line.quantity) * factor : 0]),
  );
}

export function paymentStatusFor(paidAmount: number, dueAmount: number): "PAID" | "PARTIAL" | "UNPAID" {
  if (dueAmount > MONEY_EPSILON) return paidAmount > MONEY_EPSILON ? "PARTIAL" : "UNPAID";
  return "PAID";
}
