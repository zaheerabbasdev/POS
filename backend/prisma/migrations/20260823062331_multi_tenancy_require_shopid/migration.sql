-- DropForeignKey
ALTER TABLE "brands" DROP CONSTRAINT "brands_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "cash_drawer_transactions" DROP CONSTRAINT "cash_drawer_transactions_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "cash_drawers" DROP CONSTRAINT "cash_drawers_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "expense_categories" DROP CONSTRAINT "expense_categories_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "imei_numbers" DROP CONSTRAINT "imei_numbers_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "product_models" DROP CONSTRAINT "product_models_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_return_items" DROP CONSTRAINT "purchase_return_items_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_returns" DROP CONSTRAINT "purchase_returns_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "repairs" DROP CONSTRAINT "repairs_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "sales_return_items" DROP CONSTRAINT "sales_return_items_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "sales_returns" DROP CONSTRAINT "sales_returns_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_adjustments" DROP CONSTRAINT "stock_adjustments_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "warranties" DROP CONSTRAINT "warranties_shop_id_fkey";

-- AlterTable
ALTER TABLE "brands" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "cash_drawer_transactions" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "cash_drawers" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "expense_categories" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "imei_numbers" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "inventory" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "inventory_transactions" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "product_models" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "purchase_return_items" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "purchase_returns" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "purchases" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "repairs" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sales_return_items" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sales_returns" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "stock_adjustments" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "suppliers" ALTER COLUMN "shop_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "warranties" ALTER COLUMN "shop_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_models" ADD CONSTRAINT "product_models_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imei_numbers" ADD CONSTRAINT "imei_numbers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_drawers" ADD CONSTRAINT "cash_drawers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_drawer_transactions" ADD CONSTRAINT "cash_drawer_transactions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

