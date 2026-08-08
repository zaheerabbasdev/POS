import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { logAuditFromRequest } from "../../common/utils/auditLog.js";
import * as expenseService from "./expense.service.js";
import type { ListExpensesInput } from "./expense.service.js";

export const listExpenseCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await expenseService.listExpenseCategories();
  sendSuccess(res, categories);
});

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await expenseService.listExpenses(req.validatedQuery as unknown as ListExpensesInput);
  sendPaginated(res, data, pagination);
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.createExpense({ ...req.body, recordedById: req.user?.employeeId ?? undefined });
  sendSuccess(res, expense, "Expense recorded successfully.", HttpStatus.CREATED);
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.updateExpense(req.params.id as string, req.body);
  sendSuccess(res, expense, "Expense updated successfully.");
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  await expenseService.deleteExpense(req.params.id as string);
  void logAuditFromRequest(req, "Expense", "DELETE", `Deleted expense ${req.params.id as string}.`);
  sendSuccess(res, null, "Expense deleted successfully.");
});
