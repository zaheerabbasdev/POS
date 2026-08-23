import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { NotFoundError } from "../../common/errors/AppError.js";

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
export async function createExpense(shopId: string, input: CreateExpenseInput) {
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

  const expense = await prisma.expense.create({
    data: {
      shopId,
      expenseNumber: generateCode("EXP"),
      expenseCategoryId: category.id,
      amount: input.amount,
      paymentMethod: method,
      expenseDate: input.expenseDate ?? new Date(),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.recordedById !== undefined ? { recordedById: input.recordedById } : {}),
    },
    include: expenseInclude,
  });
  return toExpenseDto(expense);
}

export interface UpdateExpenseInput {
  amount?: number;
  paymentMethod?: string;
  expenseDate?: Date;
  description?: string;
}

/** PATCH /api/v1/expenses/{id} — "Edit Expense" (SRS Module 21). */
export async function updateExpense(shopId: string, id: string, input: UpdateExpenseInput) {
  const existing = await prisma.expense.findFirst({ where: { id, shopId } });
  if (!existing) throw new NotFoundError("Expense not found.");

  const method = input.paymentMethod ? PAYMENT_METHOD_INPUT_MAP[input.paymentMethod] : undefined;

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(method !== undefined ? { paymentMethod: method } : {}),
      ...(input.expenseDate !== undefined ? { expenseDate: input.expenseDate } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    include: expenseInclude,
  });
  return toExpenseDto(expense);
}

/** DELETE /api/v1/expenses/{id} — "Delete Expense" (SRS Module 21). Expenses have no dependent records, so this is a real delete. */
export async function deleteExpense(shopId: string, id: string): Promise<void> {
  const existing = await prisma.expense.findFirst({ where: { id, shopId } });
  if (!existing) throw new NotFoundError("Expense not found.");
  await prisma.expense.delete({ where: { id } });
}
