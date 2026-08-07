import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import * as reportService from "./report.service.js";

const q = (req: Request) => req.validatedQuery as unknown as Record<string, unknown>;

// --- Sales Reports (Chapter 45) ---
export const salesSummary = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getSalesSummary(q(req) as reportService.SalesSummaryInput));
});
export const dailySales = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getDailySalesReport(q(req)));
});
export const productSales = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getProductSalesReport(q(req)));
});
export const employeeSales = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getEmployeeSalesReport(q(req)));
});

// --- Purchase Reports (Chapter 46) ---
export const purchaseSummary = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getPurchaseSummary(q(req)));
});
export const supplierPurchases = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getSupplierPurchaseReport(q(req)));
});

// --- Inventory Reports (Chapter 47) ---
export const stockReport = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await reportService.getStockReport());
});
export const lowStockReport = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await reportService.getLowStockReport());
});
export const stockMovement = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getStockMovementReport(q(req) as reportService.StockMovementInput));
});
export const imeiReport = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getImeiReport(q(req)));
});

// --- Financial Reports (Chapter 48) ---
export const profitLoss = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getProfitLossReport(q(req)));
});
export const expenseReport = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getExpenseReport(q(req)));
});
export const cashFlow = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getCashFlowReport(q(req)));
});

// --- Customer Reports (Chapter 49) ---
export const customerPurchases = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getCustomerPurchaseReport(q(req)));
});
export const customerBalance = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await reportService.getCustomerBalanceReport());
});

// --- Supplier Reports (Chapter 50) ---
export const supplierBalance = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await reportService.getSupplierBalanceReport());
});
export const supplierPayments = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await reportService.getSupplierPaymentHistory(q(req)));
});
