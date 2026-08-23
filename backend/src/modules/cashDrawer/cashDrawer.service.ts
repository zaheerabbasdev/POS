import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";

// Transaction types that add cash into the drawer vs. take it out (DDD Table
// 26's "Transaction Types" list) — used to compute the expected closing
// balance. OPENING_BALANCE/CLOSING_BALANCE are audit-trail entries, not
// movements during the session, so they're excluded from this map.
const INFLOW_TYPES = new Set(["SALE", "CASH_IN"]);
const OUTFLOW_TYPES = new Set(["REFUND", "EXPENSE", "CASH_OUT"]);

const drawerListSelect = {
  id: true,
  cashierId: true,
  cashier: { select: { id: true, username: true } },
  openingBalance: true,
  closingBalance: true,
  expectedBalance: true,
  difference: true,
  openedAt: true,
  closedAt: true,
  status: true,
} satisfies Prisma.CashDrawerSelect;

type DrawerRow = Prisma.CashDrawerGetPayload<{ select: typeof drawerListSelect }>;

function toDrawerDto(drawer: DrawerRow) {
  return {
    id: drawer.id,
    cashierId: drawer.cashierId,
    cashier: drawer.cashier.username,
    openingBalance: drawer.openingBalance,
    closingBalance: drawer.closingBalance,
    expectedBalance: drawer.expectedBalance,
    difference: drawer.difference,
    openedAt: drawer.openedAt,
    closedAt: drawer.closedAt,
    status: drawer.status,
  };
}

/** Best-effort lookup used by other modules (Sales) — never throws. */
export async function findOpenDrawer(shopId: string, cashierId: string) {
  return prisma.cashDrawer.findFirst({ where: { shopId, cashierId, status: "OPEN" } });
}

/**
 * Records a cash movement against a cashier's open drawer if one exists.
 * Called from the Sales/Sales-Returns modules on cash payments/refunds —
 * deliberately silent (no throw) when no drawer is open, since only cash
 * payments have any relationship to the physical drawer and a missing
 * session shouldn't block the sale itself.
 */
export async function recordDrawerMovement(
  tx: Prisma.TransactionClient,
  shopId: string,
  cashierId: string,
  transactionType: "SALE" | "REFUND",
  amount: number,
  referenceNumber?: string,
) {
  const drawer = await tx.cashDrawer.findFirst({ where: { shopId, cashierId, status: "OPEN" } });
  if (!drawer) return;
  await tx.cashDrawerTransaction.create({
    data: {
      shopId,
      cashDrawerId: drawer.id,
      transactionType,
      amount,
      ...(referenceNumber ? { referenceNumber } : {}),
    },
  });
}

async function computeExpectedBalance(
  shopId: string,
  drawerId: string,
  openingBalance: Prisma.Decimal | number,
): Promise<number> {
  const transactions = await prisma.cashDrawerTransaction.findMany({
    where: { shopId, cashDrawerId: drawerId, transactionType: { notIn: ["OPENING_BALANCE", "CLOSING_BALANCE"] } },
    select: { transactionType: true, amount: true },
  });

  let expected = Number(openingBalance);
  for (const t of transactions) {
    const amount = Number(t.amount);
    if (INFLOW_TYPES.has(t.transactionType)) expected += amount;
    else if (OUTFLOW_TYPES.has(t.transactionType)) expected -= amount;
  }
  return expected;
}

/** GET /api/v1/cash-drawer/current — the caller's open session, if any. */
export async function getCurrentDrawer(shopId: string, cashierId: string) {
  const drawer = await prisma.cashDrawer.findFirst({
    where: { shopId, cashierId, status: "OPEN" },
    select: drawerListSelect,
  });
  return drawer ? toDrawerDto(drawer) : null;
}

/** POST /api/v1/cash-drawer/open (API Spec Chapter 37.1). */
export async function openDrawer(shopId: string, cashierId: string, openingBalance: number) {
  const existing = await prisma.cashDrawer.findFirst({ where: { shopId, cashierId, status: "OPEN" } });
  if (existing) throw new ConflictError("You already have an open cash drawer session.");

  await prisma.$transaction(async (tx) => {
    const created = await tx.cashDrawer.create({
      data: { shopId, cashierId, openingBalance, status: "OPEN" },
    });
    await tx.cashDrawerTransaction.create({
      data: { shopId, cashDrawerId: created.id, transactionType: "OPENING_BALANCE", amount: openingBalance },
    });
  });

  const drawer = await getCurrentDrawer(shopId, cashierId);
  if (!drawer) throw new NotFoundError("Cash drawer session could not be created.");
  return drawer;
}

/** POST /api/v1/cash-drawer/close (API Spec Chapter 37.2). */
export async function closeDrawer(shopId: string, cashierId: string, closingBalance: number, notes: string | undefined) {
  const drawer = await prisma.cashDrawer.findFirst({ where: { shopId, cashierId, status: "OPEN" } });
  if (!drawer) throw new NotFoundError("No open cash drawer session found.");

  const expectedBalance = await computeExpectedBalance(shopId, drawer.id, drawer.openingBalance);
  const difference = closingBalance - expectedBalance;

  await prisma.$transaction(async (tx) => {
    await tx.cashDrawer.update({
      where: { id: drawer.id },
      data: { status: "CLOSED", closingBalance, expectedBalance, difference, closedAt: new Date() },
    });
    await tx.cashDrawerTransaction.create({
      data: {
        shopId,
        cashDrawerId: drawer.id,
        transactionType: "CLOSING_BALANCE",
        amount: closingBalance,
        ...(notes ? { remarks: notes } : {}),
      },
    });
  });

  const closed = await prisma.cashDrawer.findFirstOrThrow({ where: { id: drawer.id, shopId }, select: drawerListSelect });
  return toDrawerDto(closed);
}

async function requireOpenDrawer(shopId: string, cashierId: string) {
  const drawer = await prisma.cashDrawer.findFirst({ where: { shopId, cashierId, status: "OPEN" } });
  if (!drawer) throw new BadRequestError("Open the cash drawer before recording cash movements.");
  return drawer;
}

/** Manual "Cash In" (DDD Module 18 feature — owner/manager adding float). */
export async function cashIn(shopId: string, cashierId: string, amount: number, remarks: string | undefined) {
  const drawer = await requireOpenDrawer(shopId, cashierId);
  await prisma.cashDrawerTransaction.create({
    data: { shopId, cashDrawerId: drawer.id, transactionType: "CASH_IN", amount, ...(remarks ? { remarks } : {}) },
  });
  return getCurrentDrawer(shopId, cashierId);
}

/** Manual "Cash Out" (e.g. bank deposit, till skim). */
export async function cashOut(shopId: string, cashierId: string, amount: number, remarks: string | undefined) {
  const drawer = await requireOpenDrawer(shopId, cashierId);
  await prisma.cashDrawerTransaction.create({
    data: { shopId, cashDrawerId: drawer.id, transactionType: "CASH_OUT", amount, ...(remarks ? { remarks } : {}) },
  });
  return getCurrentDrawer(shopId, cashierId);
}

/**
 * GET /api/v1/cash-drawer/summary (API Spec Chapter 37.3) — "Opening Cash,
 * Sales Cash, Expenses, Closing Cash, Difference." Defaults to the caller's
 * open session; pass drawerId to review a past (closed) session instead.
 */
export async function getSummary(shopId: string, cashierId: string, drawerId?: string) {
  const drawer = drawerId
    ? await prisma.cashDrawer.findFirst({ where: { id: drawerId, shopId } })
    : await prisma.cashDrawer.findFirst({ where: { shopId, cashierId, status: "OPEN" } });
  if (!drawer) throw new NotFoundError(drawerId ? "Cash drawer session not found." : "No open cash drawer session found.");

  const transactions = await prisma.cashDrawerTransaction.findMany({
    where: { shopId, cashDrawerId: drawer.id },
    orderBy: { createdAt: "asc" },
  });

  const sum = (type: string) =>
    transactions.filter((t) => t.transactionType === type).reduce((acc, t) => acc + Number(t.amount), 0);

  const openingCash = Number(drawer.openingBalance);
  const salesCash = sum("SALE");
  const cashIns = sum("CASH_IN");
  const refunds = sum("REFUND");
  const expenses = sum("EXPENSE");
  const cashOuts = sum("CASH_OUT");
  const expectedClosingCash = drawer.status === "CLOSED"
    ? Number(drawer.expectedBalance ?? 0)
    : openingCash + salesCash + cashIns - refunds - expenses - cashOuts;

  return {
    drawerId: drawer.id,
    status: drawer.status,
    openedAt: drawer.openedAt,
    closedAt: drawer.closedAt,
    openingCash,
    salesCash,
    cashIn: cashIns,
    refunds,
    expenses,
    cashOut: cashOuts,
    expectedClosingCash,
    closingCash: drawer.closingBalance !== null ? Number(drawer.closingBalance) : null,
    difference: drawer.difference !== null ? Number(drawer.difference) : null,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.transactionType,
      amount: t.amount,
      referenceNumber: t.referenceNumber,
      remarks: t.remarks,
      createdAt: t.createdAt,
    })),
  };
}

export interface ListDrawersInput extends PaginationQuery {
  cashierId?: string;
  status?: "OPEN" | "CLOSED";
}

/** GET /api/v1/cash-drawer — session history (for managers/owners). */
export async function listDrawers(shopId: string, input: ListDrawersInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.CashDrawerWhereInput = {
    shopId,
    ...(input.cashierId ? { cashierId: input.cashierId } : {}),
    ...(input.status ? { status: input.status } : {}),
  };

  const [drawers, total] = await Promise.all([
    prisma.cashDrawer.findMany({ where, skip, take, orderBy: { openedAt: "desc" }, select: drawerListSelect }),
    prisma.cashDrawer.count({ where }),
  ]);

  return { data: drawers.map(toDrawerDto), pagination: buildPaginationMeta(page, limit, total) };
}
