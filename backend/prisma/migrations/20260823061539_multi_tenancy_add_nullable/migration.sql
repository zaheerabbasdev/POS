-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');

-- DropIndex
DROP INDEX "audit_logs_module_action_idx";

-- DropIndex
DROP INDEX "brands_brand_name_key";

-- DropIndex
DROP INDEX "cash_drawers_cashier_id_status_idx";

-- DropIndex
DROP INDEX "categories_category_name_key";

-- DropIndex
DROP INDEX "customers_customer_code_key";

-- DropIndex
DROP INDEX "customers_phone_key";

-- DropIndex
DROP INDEX "employees_employee_code_key";

-- DropIndex
DROP INDEX "employees_phone_key";

-- DropIndex
DROP INDEX "expense_categories_category_name_key";

-- DropIndex
DROP INDEX "expenses_expense_number_key";

-- DropIndex
DROP INDEX "inventory_transactions_transaction_type_created_at_idx";

-- DropIndex
DROP INDEX "payments_payment_date_payment_method_idx";

-- DropIndex
DROP INDEX "products_barcode_key";

-- DropIndex
DROP INDEX "products_product_name_idx";

-- DropIndex
DROP INDEX "products_sku_key";

-- DropIndex
DROP INDEX "purchases_purchase_date_idx";

-- DropIndex
DROP INDEX "purchases_purchase_number_key";

-- DropIndex
DROP INDEX "repairs_repair_ticket_number_key";

-- DropIndex
DROP INDEX "roles_role_name_key";

-- DropIndex
DROP INDEX "sales_invoice_number_key";

-- DropIndex
DROP INDEX "sales_sale_date_idx";

-- DropIndex
DROP INDEX "settings_setting_key_key";

-- DropIndex
DROP INDEX "suppliers_supplier_code_key";

-- DropIndex
DROP INDEX "suppliers_supplier_name_idx";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "cash_drawer_transactions" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "cash_drawers" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "expense_categories" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "imei_numbers" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "product_models" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "purchase_return_items" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "purchase_returns" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "repairs" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "sales_return_items" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "sales_returns" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "stock_adjustments" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "shop_id" UUID;

-- AlterTable
ALTER TABLE "warranties" ADD COLUMN     "shop_id" UUID;

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "owner_id" UUID,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "logo_url" TEXT,
    "status" "ShopStatus" NOT NULL DEFAULT 'TRIAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "billing_interval" "BillingInterval" NOT NULL DEFAULT 'CUSTOM',
    "duration_days" INTEGER NOT NULL,
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_users" INTEGER,
    "max_products" INTEGER,
    "max_monthly_sales" INTEGER,
    "max_branches" INTEGER,
    "max_storage_mb" INTEGER,
    "reports_enabled" BOOLEAN NOT NULL DEFAULT true,
    "advanced_reports" BOOLEAN NOT NULL DEFAULT false,
    "imei_tracking" BOOLEAN NOT NULL DEFAULT true,
    "repairs_enabled" BOOLEAN NOT NULL DEFAULT true,
    "warranty_enabled" BOOLEAN NOT NULL DEFAULT true,
    "multi_branch" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_history" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_status" "SubscriptionPaymentStatus" NOT NULL,
    "change_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_owner_id_key" ON "shops"("owner_id");

-- CreateIndex
CREATE INDEX "shops_status_idx" ON "shops"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "subscriptions_shop_id_status_idx" ON "subscriptions"("shop_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_shop_id_end_date_idx" ON "subscriptions"("shop_id", "end_date");

-- CreateIndex
CREATE INDEX "subscription_history_shop_id_created_at_idx" ON "subscription_history"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_shop_id_module_action_idx" ON "audit_logs"("shop_id", "module", "action");

-- CreateIndex
CREATE INDEX "brands_shop_id_idx" ON "brands"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_shop_id_brand_name_key" ON "brands"("shop_id", "brand_name");

-- CreateIndex
CREATE INDEX "cash_drawer_transactions_shop_id_idx" ON "cash_drawer_transactions"("shop_id");

-- CreateIndex
CREATE INDEX "cash_drawers_shop_id_cashier_id_status_idx" ON "cash_drawers"("shop_id", "cashier_id", "status");

-- CreateIndex
CREATE INDEX "categories_shop_id_idx" ON "categories"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_shop_id_category_name_key" ON "categories"("shop_id", "category_name");

-- CreateIndex
CREATE INDEX "customers_shop_id_idx" ON "customers"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_shop_id_customer_code_key" ON "customers"("shop_id", "customer_code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_shop_id_phone_key" ON "customers"("shop_id", "phone");

-- CreateIndex
CREATE INDEX "employees_shop_id_idx" ON "employees"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_shop_id_employee_code_key" ON "employees"("shop_id", "employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_shop_id_phone_key" ON "employees"("shop_id", "phone");

-- CreateIndex
CREATE INDEX "expense_categories_shop_id_idx" ON "expense_categories"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_shop_id_category_name_key" ON "expense_categories"("shop_id", "category_name");

-- CreateIndex
CREATE INDEX "expenses_shop_id_idx" ON "expenses"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_shop_id_expense_number_key" ON "expenses"("shop_id", "expense_number");

-- CreateIndex
CREATE INDEX "imei_numbers_shop_id_idx" ON "imei_numbers"("shop_id");

-- CreateIndex
CREATE INDEX "inventory_shop_id_idx" ON "inventory"("shop_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_shop_id_transaction_type_created_at_idx" ON "inventory_transactions"("shop_id", "transaction_type", "created_at");

-- CreateIndex
CREATE INDEX "notifications_shop_id_idx" ON "notifications"("shop_id");

-- CreateIndex
CREATE INDEX "payments_shop_id_payment_date_payment_method_idx" ON "payments"("shop_id", "payment_date", "payment_method");

-- CreateIndex
CREATE INDEX "product_models_shop_id_idx" ON "product_models"("shop_id");

-- CreateIndex
CREATE INDEX "products_shop_id_product_name_idx" ON "products"("shop_id", "product_name");

-- CreateIndex
CREATE UNIQUE INDEX "products_shop_id_sku_key" ON "products"("shop_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_shop_id_barcode_key" ON "products"("shop_id", "barcode");

-- CreateIndex
CREATE INDEX "purchase_return_items_shop_id_idx" ON "purchase_return_items"("shop_id");

-- CreateIndex
CREATE INDEX "purchase_returns_shop_id_idx" ON "purchase_returns"("shop_id");

-- CreateIndex
CREATE INDEX "purchases_shop_id_purchase_date_idx" ON "purchases"("shop_id", "purchase_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_shop_id_purchase_number_key" ON "purchases"("shop_id", "purchase_number");

-- CreateIndex
CREATE INDEX "repairs_shop_id_idx" ON "repairs"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "repairs_shop_id_repair_ticket_number_key" ON "repairs"("shop_id", "repair_ticket_number");

-- CreateIndex
CREATE INDEX "roles_shop_id_idx" ON "roles"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_shop_id_role_name_key" ON "roles"("shop_id", "role_name");

-- CreateIndex
CREATE INDEX "sales_shop_id_sale_date_idx" ON "sales"("shop_id", "sale_date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_shop_id_invoice_number_key" ON "sales"("shop_id", "invoice_number");

-- CreateIndex
CREATE INDEX "sales_return_items_shop_id_idx" ON "sales_return_items"("shop_id");

-- CreateIndex
CREATE INDEX "sales_returns_shop_id_idx" ON "sales_returns"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_shop_id_setting_key_key" ON "settings"("shop_id", "setting_key");

-- CreateIndex
CREATE INDEX "stock_adjustments_shop_id_idx" ON "stock_adjustments"("shop_id");

-- CreateIndex
CREATE INDEX "suppliers_shop_id_supplier_name_idx" ON "suppliers"("shop_id", "supplier_name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_shop_id_supplier_code_key" ON "suppliers"("shop_id", "supplier_code");

-- CreateIndex
CREATE INDEX "users_shop_id_idx" ON "users"("shop_id");

-- CreateIndex
CREATE INDEX "warranties_shop_id_idx" ON "warranties"("shop_id");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_models" ADD CONSTRAINT "product_models_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imei_numbers" ADD CONSTRAINT "imei_numbers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_drawers" ADD CONSTRAINT "cash_drawers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_drawer_transactions" ADD CONSTRAINT "cash_drawer_transactions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

