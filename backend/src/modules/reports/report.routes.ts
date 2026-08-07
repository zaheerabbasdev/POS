import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as reportController from "./report.controller.js";
import { dateRangeQuerySchema, imeiReportQuerySchema, salesSummaryQuerySchema, stockMovementQuerySchema } from "./report.validation.js";

export const reportRouter = Router();

reportRouter.use(authenticate);
reportRouter.use(requirePermission("REPORT_VIEW", "REPORT_EXPORT"));

// Chapter 45 – Sales Reports
reportRouter.get("/sales/summary", validate({ query: salesSummaryQuerySchema }), reportController.salesSummary);
reportRouter.get("/sales/daily", validate({ query: dateRangeQuerySchema }), reportController.dailySales);
reportRouter.get("/sales/products", validate({ query: dateRangeQuerySchema }), reportController.productSales);
reportRouter.get("/sales/employees", validate({ query: dateRangeQuerySchema }), reportController.employeeSales);

// Chapter 46 – Purchase Reports
reportRouter.get("/purchases/summary", validate({ query: dateRangeQuerySchema }), reportController.purchaseSummary);
reportRouter.get("/purchases/suppliers", validate({ query: dateRangeQuerySchema }), reportController.supplierPurchases);

// Chapter 47 – Inventory Reports
reportRouter.get("/inventory/stock", reportController.stockReport);
reportRouter.get("/inventory/low-stock", reportController.lowStockReport);
reportRouter.get("/inventory/movement", validate({ query: stockMovementQuerySchema }), reportController.stockMovement);
reportRouter.get("/inventory/imei", validate({ query: imeiReportQuerySchema }), reportController.imeiReport);

// Chapter 48 – Financial Reports
reportRouter.get("/financial/profit-loss", validate({ query: dateRangeQuerySchema }), reportController.profitLoss);
reportRouter.get("/financial/expenses", validate({ query: dateRangeQuerySchema }), reportController.expenseReport);
reportRouter.get("/financial/cash-flow", validate({ query: dateRangeQuerySchema }), reportController.cashFlow);

// Chapter 49 – Customer Reports
reportRouter.get("/customers/purchases", validate({ query: dateRangeQuerySchema }), reportController.customerPurchases);
reportRouter.get("/customers/balance", reportController.customerBalance);

// Chapter 50 – Supplier Reports
reportRouter.get("/suppliers/balance", reportController.supplierBalance);
reportRouter.get("/suppliers/payments", validate({ query: dateRangeQuerySchema }), reportController.supplierPayments);
