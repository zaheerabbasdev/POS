import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { NotFoundError } from "../../common/errors/AppError.js";
import { recordDrawerMovement } from "../cashDrawer/cashDrawer.service.js";

const expenseInclude = {
  category: { select: { id: true, categoryName: true } },
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

function toExpenseDto(expense: ExpenseRow) {
  return {
    id: expense.id,
    expenseNumber: expense.expenseNumber,
    categoryId: expense.category.id,
    category: expense.category.categoryName,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
    expenseDate: expense.expenseDate,
    recordedBy: expense.recordedBy
      ? [expense.recordedBy.firstName, expense.recordedBy.lastName].filter(Boolean).join(" ")
      : null,
    description: expense.description,
    createdAt: expense.createdAt,
  };
}

/** GET /api/v1/expense-categories — for the Add Expense form's dropdown. */
export async function listExpenseCategories(shopId: string) {
  const categories = await prisma.expenseCategory.findMany({
    where: { shopId, isActive: true },
    orderBy: { categoryName: "asc" },
  });
  return categories.map((c) => ({ id: c.id, name: c.categoryName }));
}

export interface ListExpensesInput extends PaginationQuery {
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
}

/** GET /api/v1/expenses (API Spec Chapter 43.1). */
export async function listExpenses(shopId: string, input: ListExpensesInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.ExpenseWhereInput = {
    shopId,
    ...(input.categoryId ? { expenseCategoryId: input.categoryId } : {}),
    ...(input.startDate || input.endDate
      ? { expenseDate: { ...(input.startDate ? { gte: input.startDate } : {}), ...(input.endDate ? { lte: input.endDate } : {}) } }
      : {}),
  };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where, skip, take, orderBy: { expenseDate: "desc" }, include: expenseInclude }),
    prisma.expense.count({ where }),
  ]);

  return { data: expenses.map(toExpenseDto), pagination: buildPaginationMeta(page, limit, total) };
}

export interface CreateExpenseInput {
  category: string;
  amount: number;
  paymentMethod?: string;
  expenseDate?: Date;
  description?: string;
  recordedById?: string;
}

/**
 * POST /api/v1/expenses (API Spec Chapter 43.2). The spec sends a free-text
 * "category" name rather than a categoryId — matched case-insensitively
 * against ExpenseCategory (Module 21's fixed list, seeded at setup) and
 * created on the fly if the shop has added a custom one since.
 */
export async function createExpense(shopId: string, input: CreateExpenseInput, userId: string) {
  const trimmedName = input.category.trim();
  let category = await prisma.expenseCategory.findFirst({
    where: { shopId, categoryName: { equals: trimmedName, mode: "insensitive" } },
  });
  if (!category) {
    category = await prisma.expenseCategory.create({ data: { shopId, categoryName: trimmedName } });
  }

  if (input.recordedById !== undefined) {
    const employee = await prisma.employee.findFirst({ where: { id: input.recordedById, shopId } });
    if (!employee) throw new NotFoundError("Employee not found.");
  }

  const method = input.paymentMethod ? (PAYMENT_METHOD_INPUT_MAP[input.paymentMethod] ?? "CASH") : "CASH";

  const expenseDate = input.expenseDate ?? new Date();

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        shopId,
        expenseNumber: generateCode("EXP"),
        expenseCategoryId: category.id,
        amount: input.amount,
        paymentMethod: method,
        expenseDate,
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.recordedById !== undefined ? { recordedById: input.recordedById } : {}),
      },
      include: expenseInclude,
    });

    if (method === "CASH" && isToday(expenseDate)) {
      await recordDrawerMovement(tx, shopId, userId, "EXPENSE", input.amount, created.expenseNumber);
    }
    return created;
  });
  return toExpenseDto(expense);
}

/**
 * A cash expense paid today comes out of the till, so it's taken off the
 * recording user's open drawer (skipped if they have none open — same
 * best-effort rule as sales). A back-dated expense isn't: that cash left the
 * till on an earlier day, not during today's session.
 */
function isToday(date: Date): boolean {
  // Dates arrive as calendar days (stored at UTC midnight) while the server
  // clock is UTC — a shop ahead of or behind UTC can legitimately be one
  // calendar day off near midnight, so a one-day window counts as "today".
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.abs(day - today) <= 24 * 60 * 60 * 1000;
}

/**
 * The drawer entry an expense created, if its drawer session is still open.
 * Entries in an already-closed session are left alone — that session's
 * count is final.
 */
async function findOpenDrawerEntry(tx: Prisma.TransactionClient, shopId: string, expenseNumber: string) {
  return tx.cashDrawerTransaction.findFirst({
    where: { shopId, transactionType: "EXPENSE", referenceNumber: expenseNumber, cashDrawer: { status: "OPEN" } },
  });
}

export interface UpdateExpenseInput {
  amount?: number;
  paymentMethod?: string;
  expenseDate?: Date;
  description?: string;
}

/** PATCH /api/v1/expenses/{id} — "Edit Expense" (SRS Module 21). */
export async function updateExpense(shopId: string, id: string, input: UpdateExpenseInput, userId: string) {
  const existing = await prisma.expense.findFirst({ where: { id, shopId } });
  if (!existing) throw new NotFoundError("Expense not found.");

  const method = input.paymentMethod ? PAYMENT_METHOD_INPUT_MAP[input.paymentMethod] : undefined;

  const expense = await prisma.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id },
      data: {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(method !== undefined ? { paymentMethod: method } : {}),
        ...(input.expenseDate !== undefined ? { expenseDate: input.expenseDate } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      include: expenseInclude,
    });

    // Keep the open drawer in step with the edit: a changed amount, a switch
    // between cash and non-cash, or a date moved off today.
    const entry = await findOpenDrawerEntry(tx, shopId, updated.expenseNumber);
    const shouldBeInDrawer = updated.paymentMethod === "CASH" && isToday(updated.expenseDate);
    if (entry && !shouldBeInDrawer) {
      await tx.cashDrawerTransaction.delete({ where: { id: entry.id } });
    } else if (entry) {
      await tx.cashDrawerTransaction.update({ where: { id: entry.id }, data: { amount: updated.amount } });
    } else if (shouldBeInDrawer && existing.paymentMethod !== "CASH") {
      await recordDrawerMovement(tx, shopId, userId, "EXPENSE", Number(updated.amount), updated.expenseNumber);
    }

    return updated;
  });
  return toExpenseDto(expense);
}

/** DELETE /api/v1/expenses/{id} — "Delete Expense" (SRS Module 21). Expenses have no dependent records, so this is a real delete. */
export async function deleteExpense(shopId: string, id: string): Promise<void> {
  const existing = await prisma.expense.findFirst({ where: { id, shopId } });
  if (!existing) throw new NotFoundError("Expense not found.");
  await prisma.$transaction(async (tx) => {
    // Put the cash back in the open drawer's count, if it was taken from one.
    const entry = await findOpenDrawerEntry(tx, shopId, existing.expenseNumber);
    if (entry) await tx.cashDrawerTransaction.delete({ where: { id: entry.id } });
    await tx.expense.delete({ where: { id } });
  });
}
