-- A returned or cancelled phone goes back on the shelf and can be sold again,
-- so one IMEI may appear on several sale lines over its life (was one-to-one).

-- DropIndex
DROP INDEX "sale_items_imei_id_key";

-- CreateIndex
CREATE INDEX "sale_items_imei_id_idx" ON "sale_items"("imei_id");
