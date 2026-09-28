import type { Prisma } from "../../generated/prisma/client.js";
import { round2 } from "../../common/utils/money.js";

type Db = Pick<Prisma.TransactionClient, "payment" | "purchaseReturn">;

/**
 * What's still owed to the supplier on one purchase. Purchases don't store
 * paid/due columns, so it's worked out from the payments made and the goods
 * sent back: total − paid − returned. Without the returned part, goods sent
 * back to the supplier would still show as owed and could be paid for twice.
 */
export async function getPurchaseBalance(db: Db, shopId: string, purchase: { id: string; totalAmount: Prisma.Decimal }) {
  const [paidAgg, returnedAgg] = await Promise.all([
    db.payment.aggregate({
      where: { shopId, paymentType: "PURCHASE_PAYMENT", referenceId: purchase.id },
      _sum: { amount: true },
    }),
    db.purchaseReturn.aggregate({ where: { shopId, purchaseId: purchase.id }, _sum: { returnAmount: true } }),
  ]);

  const paid = Number(paidAgg._sum.amount ?? 0);
  const returned = Number(returnedAgg._sum.returnAmount ?? 0);
  const due = round2(Math.max(0, Number(purchase.totalAmount) - paid - returned));
  return { paid, returned, due };
}

export function purchasePaymentStatus(paid: number, due: number): "PENDING" | "PARTIAL" | "PAID" {
  if (due <= 0) return "PAID";
  return paid > 0 ? "PARTIAL" : "PENDING";
}
