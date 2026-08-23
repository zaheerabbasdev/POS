import { Router } from "express";
import { authRouter } from "../modules/auth/index.js";
import { userRouter } from "../modules/users/index.js";
import { roleRouter } from "../modules/roles/index.js";
import { permissionRouter } from "../modules/permissions/index.js";
import { brandRouter } from "../modules/brands/index.js";
import { categoryRouter } from "../modules/categories/index.js";
import { productModelRouter } from "../modules/productModels/index.js";
import { productRouter } from "../modules/products/index.js";
import { inventoryRouter } from "../modules/inventory/index.js";
import { customerRouter } from "../modules/customers/index.js";
import { supplierRouter } from "../modules/suppliers/index.js";
import { purchaseRouter } from "../modules/purchases/index.js";
import { saleRouter } from "../modules/sales/index.js";
import { paymentRouter } from "../modules/payments/index.js";
import { dashboardRouter } from "../modules/dashboard/index.js";
import { cashDrawerRouter } from "../modules/cashDrawer/index.js";
import { salesReturnRouter } from "../modules/salesReturns/index.js";
import { purchaseReturnRouter } from "../modules/purchaseReturns/index.js";
import { employeeRouter } from "../modules/employees/index.js";
import { repairRouter } from "../modules/repairs/index.js";
import { warrantyRouter } from "../modules/warranties/index.js";
import { expenseRouter } from "../modules/expenses/index.js";
import { reportRouter } from "../modules/reports/index.js";
import { exportRouter } from "../modules/export/index.js";
import { uploadRouter } from "../modules/uploads/index.js";
import { settingRouter } from "../modules/settings/index.js";
import { auditRouter } from "../modules/audit/index.js";
import { registrationRouter } from "../modules/registration/index.js";
import { subscriptionRouter } from "../modules/subscriptions/index.js";
import { shopRouter } from "../modules/shops/index.js";
import { subscriptionPlanRouter } from "../modules/subscriptionPlans/index.js";
import { platformDashboardRouter } from "../modules/platformDashboard/index.js";

// Root API router — mounted at /api/v1 in app.ts. Each feature module keeps
// its own router (e.g. modules/products/product.routes.ts per SAD Chapter
// 15) and gets registered here.
export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({ success: true, message: "Mobile Shop POS API v1", data: null });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/roles", roleRouter);
apiRouter.use("/permissions", permissionRouter);
apiRouter.use("/brands", brandRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/models", productModelRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/inventory", inventoryRouter);
apiRouter.use("/customers", customerRouter);
apiRouter.use("/suppliers", supplierRouter);
apiRouter.use("/purchases", purchaseRouter);
apiRouter.use("/sales", saleRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/cash-drawer", cashDrawerRouter);
apiRouter.use("/sales-returns", salesReturnRouter);
apiRouter.use("/purchase-returns", purchaseReturnRouter);
apiRouter.use("/employees", employeeRouter);
apiRouter.use("/repairs", repairRouter);
apiRouter.use("/warranties", warrantyRouter);
apiRouter.use("/expenses", expenseRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/export", exportRouter);
apiRouter.use("/uploads", uploadRouter);
apiRouter.use("/settings", settingRouter);
apiRouter.use("/audit-logs", auditRouter);
apiRouter.use("/registration", registrationRouter);
apiRouter.use("/subscription", subscriptionRouter);
apiRouter.use("/admin/shops", shopRouter);
apiRouter.use("/admin/subscription-plans", subscriptionPlanRouter);
apiRouter.use("/admin/dashboard", platformDashboardRouter);
// ...
