import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";

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
export async function listPayments(input: ListPaymentsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.PaymentWhereInput = {
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
 */
export async function createPayment(input: CreatePaymentInput, receivedById: string) {
  const method = PAYMENT_METHOD_INPUT_MAP[input.method]!;

  if (input.type === "customer") {
    const sale = await prisma.sale.findUnique({ where: { id: input.referenceId } });
    if (!sale) throw new NotFoundError("Sale not found.");
    if (input.amount > sale.dueAmount.toNumber()) {
      throw new BadRequestError(`Amount exceeds the remaining due amount of ${sale.dueAmount}.`);
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          paymentType: "SALE_PAYMENT",
          referenceId: input.referenceId,
          paymentMethod: method,
          paymentDate: new Date(),
          amount: input.amount,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          receivedById,
        },
      });

      const newPaidAmount = sale.paidAmount.plus(input.amount);
      const newDueAmount = sale.totalAmount.minus(newPaidAmount);
      await tx.sale.update({
        where: { id: input.referenceId },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          paymentStatus: newDueAmount.lessThanOrEqualTo(0) ? "PAID" : "PARTIAL",
        },
      });

      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingBalance: { decrement: input.amount } },
        });
      }

      return created;
    });

    return toPaymentDto(payment);
  }

  const purchase = await prisma.purchase.findUnique({ where: { id: input.referenceId } });
  if (!purchase) throw new NotFoundError("Purchase not found.");

  const paidSoFarAgg = await prisma.payment.aggregate({
    where: { paymentType: "PURCHASE_PAYMENT", referenceId: input.referenceId },
    _sum: { amount: true },
  });
  const paidSoFar = paidSoFarAgg._sum.amount ?? 0;
  const dueAmount = purchase.totalAmount.minus(paidSoFar);
  if (input.amount > dueAmount.toNumber()) {
    throw new BadRequestError(`Amount exceeds the remaining due amount of ${dueAmount}.`);
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        paymentType: "PURCHASE_PAYMENT",
        referenceId: input.referenceId,
        paymentMethod: method,
        paymentDate: new Date(),
        amount: input.amount,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        receivedById,
      },
    });

    const newDueAmount = dueAmount.minus(input.amount);
    await tx.purchase.update({
      where: { id: input.referenceId },
      data: { paymentStatus: newDueAmount.lessThanOrEqualTo(0) ? "PAID" : "PARTIAL" },
    });

    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: { outstandingBalance: { decrement: input.amount } },
    });

    return created;
  });

  return toPaymentDto(payment);
}

/** GET /api/v1/payments/history/{id} (API Spec Chapter 36.3). */
export async function getPaymentHistory(referenceId: string) {
  const [sale, purchase] = await Promise.all([
    prisma.sale.findUnique({ where: { id: referenceId } }),
    prisma.purchase.findUnique({ where: { id: referenceId } }),
  ]);

  if (!sale && !purchase) throw new NotFoundError("No sale or purchase found for this id.");

  const payments = await prisma.payment.findMany({
    where: { referenceId },
    orderBy: { paymentDate: "desc" },
  });

  let remainingBalance = sale?.dueAmount;
  if (!sale && purchase) {
    const paidAgg = await prisma.payment.aggregate({
      where: { paymentType: "PURCHASE_PAYMENT", referenceId },
      _sum: { amount: true },
    });
    remainingBalance = purchase.totalAmount.minus(paidAgg._sum.amount ?? 0);
  }

  return { payments: payments.map(toPaymentDto), remainingBalance };
}
