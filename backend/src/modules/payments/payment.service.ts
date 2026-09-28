import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { MONEY_EPSILON, round2 } from "../../common/utils/money.js";
import { recordDrawerMovement } from "../cashDrawer/cashDrawer.service.js";
import { getPurchaseBalance, purchasePaymentStatus } from "../purchases/purchaseBalance.js";
import { paymentStatusFor } from "../sales/saleReturnState.js";

function toPaymentDto(payment: Prisma.PaymentGetPayload<object>) {
  return {
    id: payment.id,
    type: payment.paymentType === "SALE_PAYMENT" || payment.paymentType === "REFUND" ? "customer" : "supplier",
    referenceId: payment.referenceId,
    amount: payment.amount,
    method: payment.paymentMethod,
    date: payment.paymentDate,
    notes: payment.notes,
  };
}

export interface ListPaymentsInput extends PaginationQuery {
  type?: "customer" | "supplier";
  method?: string;
  startDate?: Date;
  endDate?: Date;
}

/** GET /api/v1/payments (API Spec Chapter 36.1). */
export async function listPayments(shopId: string, input: ListPaymentsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.PaymentWhereInput = {
    shopId,
    ...(input.type ? { paymentType: input.type === "customer" ? "SALE_PAYMENT" : "PURCHASE_PAYMENT" } : {}),
    ...(input.method ? { paymentMethod: PAYMENT_METHOD_INPUT_MAP[input.method] } : {}),
    ...(input.startDate || input.endDate
      ? {
          paymentDate: {
            ...(input.startDate ? { gte: input.startDate } : {}),
            ...(input.endDate ? { lte: input.endDate } : {}),
          },
        }
      : {}),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({ where, skip, take, orderBy: { paymentDate: "desc" } }),
    prisma.payment.count({ where }),
  ]);

  return { data: payments.map(toPaymentDto), pagination: buildPaginationMeta(page, limit, total) };
}

export interface CreatePaymentInput {
  type: "customer" | "supplier";
  referenceId: string;
  amount: number;
  method: string;
  notes?: string;
}

/**
 * POST /api/v1/payments (API Spec Chapter 36.2) — records an additional
 * payment against an existing sale or purchase (e.g. a customer paying off
 * part of their due amount later) and keeps that record's paid/due amounts
 * and payment status, plus the customer/supplier's outstanding balance, in
 * sync. The *first* payment on a sale/purchase is instead recorded inline
 * by Create Sale/Create Purchase (API Spec 31.3 / 34.3) — this endpoint is
 * for everything after that.
 *
 * `referenceId` is a polymorphic pointer (Sale.id or Purchase.id depending on
 * `type`) and deliberately not a Prisma relation — see the Payment model's
 * schema comment — so the referenced Sale/Purchase is explicitly looked up
 * shop-scoped (`findFirst`, never `findUnique`) before the Payment row is
 * ever created.
 */
export async function createPayment(shopId: string, input: CreatePaymentInput, receivedById: string) {
  const method = PAYMENT_METHOD_INPUT_MAP[input.method]!;
  const amount = round2(input.amount);

  if (input.type === "customer") {
    const sale = await prisma.sale.findFirst({ where: { id: input.referenceId, shopId } });
    if (!sale) throw new NotFoundError("Sale not found.");
    if (sale.isCancelled) throw new BadRequestError("This sale was cancelled — it can't take payments.");
    if (amount > sale.dueAmount.toNumber()) {
      throw new BadRequestError(`Amount exceeds the remaining due amount of ${sale.dueAmount}.`);
    }

    const payment = await prisma.$transaction(async (tx) => {
      // Atomic: only applies if the sale still owes at least this much right
      // now. Two people recording the same payment at once can't both succeed
      // and push the balance below zero. dueAmount is the source of truth
      // (not totalAmount − paid), since returns also reduce it.
      const updated = await tx.sale.updateMany({
        where: { id: sale.id, shopId, isCancelled: false, dueAmount: { gte: amount } },
        data: { paidAmount: { increment: amount }, dueAmount: { decrement: amount } },
      });
      if (updated.count === 0) {
        throw new ConflictError("This sale's balance just changed — please refresh and try again.");
      }
      const fresh = await tx.sale.findFirstOrThrow({ where: { id: sale.id, shopId } });
      await tx.sale.update({
        where: { id: sale.id },
        data: { paymentStatus: paymentStatusFor(Number(fresh.paidAmount), Number(fresh.dueAmount)) },
      });

      const created = await tx.payment.create({
        data: {
          shopId,
          paymentType: "SALE_PAYMENT",
          referenceId: input.referenceId,
          paymentMethod: method,
          paymentDate: new Date(),
          amount,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          receivedById,
        },
      });

      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingBalance: { decrement: amount } },
        });
      }

      // Cash a customer brings in later goes into the till just like cash
      // taken at the counter (skipped if the person recording it has no open
      // drawer — same best-effort rule as sales).
      if (method === "CASH") {
        await recordDrawerMovement(tx, shopId, receivedById, "SALE", amount, sale.invoiceNumber);
      }

      return created;
    });

    return toPaymentDto(payment);
  }

  const purchase = await prisma.purchase.findFirst({ where: { id: input.referenceId, shopId } });
  if (!purchase) throw new NotFoundError("Purchase not found.");

  const payment = await prisma.$transaction(async (tx) => {
    // Lock the purchase so two payments recorded at once can't both pass the
    // "not more than what's owed" check.
    await tx.$queryRaw`SELECT id FROM purchases WHERE id = ${purchase.id}::uuid AND shop_id = ${shopId}::uuid FOR UPDATE`;
    const { paid, due } = await getPurchaseBalance(tx, shopId, purchase);
    if (amount > due + MONEY_EPSILON) {
      throw new BadRequestError(`Amount exceeds the remaining due amount of ${due}.`);
    }

    const created = await tx.payment.create({
      data: {
        shopId,
        paymentType: "PURCHASE_PAYMENT",
        referenceId: input.referenceId,
        paymentMethod: method,
        paymentDate: new Date(),
        amount,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        receivedById,
      },
    });

    await tx.purchase.update({
      where: { id: input.referenceId },
      data: { paymentStatus: purchasePaymentStatus(paid + amount, round2(due - amount)) },
    });

    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: { outstandingBalance: { decrement: amount } },
    });

    return created;
  });

  return toPaymentDto(payment);
}

/** GET /api/v1/payments/history/{id} (API Spec Chapter 36.3). */
export async function getPaymentHistory(shopId: string, referenceId: string) {
  const [sale, purchase] = await Promise.all([
    prisma.sale.findFirst({ where: { id: referenceId, shopId } }),
    prisma.purchase.findFirst({ where: { id: referenceId, shopId } }),
  ]);

  if (!sale && !purchase) throw new NotFoundError("No sale or purchase found for this id.");

  const payments = await prisma.payment.findMany({
    where: { referenceId, shopId },
    orderBy: { paymentDate: "desc" },
  });

  let remainingBalance: Prisma.Decimal | number | undefined = sale?.dueAmount;
  if (!sale && purchase) {
    remainingBalance = (await getPurchaseBalance(prisma, shopId, purchase)).due;
  }

  return { payments: payments.map(toPaymentDto), remainingBalance };
}
