import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as employeeController from "./employee.controller.js";
import {
  createEmployeeSchema,
  employeeIdParamSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
} from "./employee.validation.js";

export const employeeRouter = Router();

employeeRouter.use(authenticate);

employeeRouter.get(
  "/",
  requirePermission("EMPLOYEE_VIEW", "EMPLOYEE_MANAGE"),
  validate({ query: listEmployeesQuerySchema }),
  employeeController.listEmployees,
);
employeeRouter.get(
  "/:id",
  requirePermission("EMPLOYEE_VIEW", "EMPLOYEE_MANAGE"),
  validate({ params: employeeIdParamSchema }),
  employeeController.getEmployee,
);
employeeRouter.post(
  "/",
  requirePermission("EMPLOYEE_MANAGE"),
  validate({ body: createEmployeeSchema }),
  employeeController.createEmployee,
);
employeeRouter.patch(
  "/:id",
  requirePermission("EMPLOYEE_MANAGE"),
  validate({ params: employeeIdParamSchema, body: updateEmployeeSchema }),
  employeeController.updateEmployee,
);
employeeRouter.delete(
  "/:id",
  requirePermission("EMPLOYEE_MANAGE"),
  validate({ params: employeeIdParamSchema }),
  employeeController.deactivateEmployee,
);
