import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requireOperationalAccess } from "../../common/middleware/operationalAccess.js";
import * as expenseController from "./expense.controller.js";
import { createExpenseSchema, expenseIdParamSchema, listExpensesQuerySchema, updateExpenseSchema } from "./expense.validation.js";

export const expenseRouter = Router();

expenseRouter.use(authenticate);

expenseRouter.get(
  "/categories",
  requirePermission("EXPENSE_VIEW", "EXPENSE_MANAGE"),
  expenseController.listExpenseCategories,
);
expenseRouter.get(
  "/",
  requirePermission("EXPENSE_VIEW", "EXPENSE_MANAGE"),
  validate({ query: listExpensesQuerySchema }),
  expenseController.listExpenses,
);
expenseRouter.post(
  "/",
  requirePermission("EXPENSE_MANAGE"),
  requireOperationalAccess,
  validate({ body: createExpenseSchema }),
  expenseController.createExpense,
);
expenseRouter.patch(
  "/:id",
  requirePermission("EXPENSE_MANAGE"),
  requireOperationalAccess,
  validate({ params: expenseIdParamSchema, body: updateExpenseSchema }),
  expenseController.updateExpense,
);
expenseRouter.delete(
  "/:id",
  requirePermission("EXPENSE_MANAGE"),
  requireOperationalAccess,
  validate({ params: expenseIdParamSchema }),
  expenseController.deleteExpense,
);
