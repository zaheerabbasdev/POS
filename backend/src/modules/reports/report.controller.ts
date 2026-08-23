import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as reportService from "./report.service.js";

const q = (req: Request) => req.validatedQuery as unknown as Record<string, unknown>;

// --- Sales Reports (Chapter 45) ---
export const salesSummary = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getSalesSummary(shopId, q(req) as reportService.SalesSummaryInput));
});
export const dailySales = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getDailySalesReport(shopId, q(req)));
});
export const productSales = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getProductSalesReport(shopId, q(req)));
});
export const employeeSales = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getEmployeeSalesReport(shopId, q(req)));
});

// --- Purchase Reports (Chapter 46) ---
export const purchaseSummary = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getPurchaseSummary(shopId, q(req)));
});
export const supplierPurchases = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getSupplierPurchaseReport(shopId, q(req)));
});

// --- Inventory Reports (Chapter 47) ---
export const stockReport = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getStockReport(shopId));
});
export const lowStockReport = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getLowStockReport(shopId));
});
export const stockMovement = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getStockMovementReport(shopId, q(req) as reportService.StockMovementInput));
});
export const imeiReport = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getImeiReport(shopId, q(req)));
});

// --- Financial Reports (Chapter 48) ---
export const profitLoss = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getProfitLossReport(shopId, q(req)));
});
export const expenseReport = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getExpenseReport(shopId, q(req)));
});
export const cashFlow = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getCashFlowReport(shopId, q(req)));
});

// --- Customer Reports (Chapter 49) ---
export const customerPurchases = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getCustomerPurchaseReport(shopId, q(req)));
});
export const customerBalance = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getCustomerBalanceReport(shopId));
});

// --- Supplier Reports (Chapter 50) ---
export const supplierBalance = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getSupplierBalanceReport(shopId));
});
export const supplierPayments = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  sendSuccess(res, await reportService.getSupplierPaymentHistory(shopId, q(req)));
});
