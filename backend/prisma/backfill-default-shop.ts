import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

/**
 * One-off migration tool - converts an EXISTING, already-populated
 * single-tenant database (real production data, not a fresh dev DB - for
 * that, use prisma/seed.ts instead) into the new multi-tenant shape:
 *
 *   1. Creates one "Default Shop" for all pre-existing data.
 *   2. Assigns the existing seeded admin/Owner user as that shop's owner
 *      (stays a SHOP-level owner - never auto-promoted to Platform Admin).
 *   3. Points every existing tenant row's shopId at that shop.
 *   4. Scopes the existing seeded roles to that shop.
 *   5. Leaves the Platform Admin role/user to be created by prisma/seed.ts
 *      (which is shop-aware and idempotent, so it's safe to run again
 *      after this backfill).
 *   6. Creates a non-expiring "Legacy Access" subscription for the shop so
 *      existing usage is never interrupted (this is pre-existing production
 *      usage, not a new trial signup).
 *   7. Writes one AuditLog row documenting the migration.
 *   8. Verifies zero remaining NULL shopId rows before exiting 0.
 *
 * SAFETY:
 *   - Never deletes or resets anything - every step is an UPDATE/CREATE.
 *   - Must be run AFTER the additive "nullable shopId" migration and
 *     BEFORE the "NOT NULL + composite unique constraints" migration -
 *     running it before the first will fail (columns don't exist yet);
 *     running the NOT NULL migration before this backfill will fail (NOT
 *     NULL violation on existing rows).
 *   - BACK UP THE DATABASE FIRST (pg_dump or your host's snapshot tool).
 *     This script is safe to re-run (idempotent - see the "already exists"
 *     checks below), but a backup is still the right precaution before any
 *     schema-adjacent change to a real database.
 *
 * Run with: npx tsx prisma/backfill-default-shop.ts
 */

const adapter = new PrismaPg({ connectionString: process.env["DIRECT_DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

const DEFAULT_SHOP_NAME = "Default Shop";
const PLATFORM_ADMIN_ROLE_NAME = "Platform Admin";
const SEED_ADMIN_USERNAME = "admin";

// Every tenant model that gained a shopId column in the multi-tenancy
// migration and needs its existing rows backfilled. Each entry is the
// Prisma model's delegate name on `prisma`.
const TENANT_MODELS = [
  "employee",
  "brand",
  "category",
  "productModel",
  "product",
  "imeiNumber",
  "inventory",
  "inventoryTransaction",
  "stockAdjustment",
  "customer",
  "supplier",
  "purchase",
  "purchaseReturn",
  "purchaseReturnItem",
  "sale",
  "salesReturn",
  "salesReturnItem",
  "payment",
  "cashDrawer",
  "cashDrawerTransaction",
  "repair",
  "warranty",
  "expenseCategory",
  "expense",
  "notification",
  "auditLog",
  "setting",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

async function main(): Promise<void> {
  console.log("=== Multi-tenancy backfill: converting existing data to a Default Shop ===\n");

  // 1. Find-or-create the Default Shop. Idempotent: re-running this script
  // after a partial/interrupted run picks the same shop back up instead of
  // creating a second one. The reliable signal that a previous run already
  // created one is the existing admin user's own shopId (the created
  // shop's *name* may not literally be "Default Shop" - it's taken from
  // the shop_name Setting when one exists), not a name match.
  const adminForLookup = await prisma.user.findUnique({ where: { username: SEED_ADMIN_USERNAME } });
  let shop = adminForLookup?.shopId
    ? await prisma.shop.findUnique({ where: { id: adminForLookup.shopId } })
    : await prisma.shop.findFirst({ where: { name: DEFAULT_SHOP_NAME } });
  if (shop) {
    console.log(`Default Shop already exists (id=${shop.id}, name="${shop.name}") - resuming backfill against it.`);
  } else {
    // Reuse the shop's own branding settings if any were configured
    // (Setting rows still have shopId = NULL at this point, pre-backfill).
    const nameSetting = await prisma.setting.findFirst({ where: { settingKey: "shop_name" } });
    const shopName = nameSetting?.settingValue?.trim() || DEFAULT_SHOP_NAME;
    shop = await prisma.shop.create({ data: { name: shopName, status: "ACTIVE" } });
    console.log(`Created Default Shop "${shop.name}" (id=${shop.id}).`);
  }
  const shopId = shop.id;

  // 2. Point the existing seeded admin/Owner user at this shop as owner -
  // stays a shop-level Owner, NOT promoted to Platform Admin.
  const existingAdmin = await prisma.user.findUnique({ where: { username: SEED_ADMIN_USERNAME } });
  if (existingAdmin && existingAdmin.shopId === null) {
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { shopId } });
    console.log(`Assigned existing admin user "${SEED_ADMIN_USERNAME}" to the Default Shop.`);
  }
  if (existingAdmin && !shop.ownerId) {
    await prisma.shop.update({ where: { id: shop.id }, data: { ownerId: existingAdmin.id } });
    console.log(`Set "${SEED_ADMIN_USERNAME}" as the Default Shop's owner.`);
  }

  // Any other pre-existing user with no shop yet also belongs to the
  // Default Shop - this is a single-tenant DB being converted, so every
  // pre-existing user account belongs to the one shop that existed. (The
  // Platform Admin account doesn't exist yet at this point in the sequence
  // - this script never creates it, see step 5 below.)
  const otherUsers = await prisma.user.updateMany({ where: { shopId: null }, data: { shopId } });
  if (otherUsers.count > 0) {
    console.log(`Assigned ${otherUsers.count} other pre-existing user(s) to the Default Shop.`);
  }

  // 3. Scope the existing seeded roles to this shop.
  const roleUpdate = await prisma.role.updateMany({
    where: { shopId: null, roleName: { not: PLATFORM_ADMIN_ROLE_NAME } },
    data: { shopId },
  });
  console.log(`Scoped ${roleUpdate.count} existing role(s) to the Default Shop.`);

  // 4. Backfill shopId on every tenant table.
  console.log("\nBackfilling shopId on tenant tables...");
  for (const model of TENANT_MODELS) {
    const delegate = (prisma as AnyPrisma)[model];
    const result = await delegate.updateMany({ where: { shopId: null }, data: { shopId } });
    console.log(`  ${model.padEnd(24)} ${result.count} row(s) updated`);
  }

  // 5. Platform Admin role (idempotent) - the user itself is created by
  // prisma/seed.ts, which already knows how to create it safely alongside
  // an already-migrated shop.
  console.log("\nEnsuring a Platform Admin role exists...");
  let platformRole = await prisma.role.findFirst({ where: { shopId: null, roleName: PLATFORM_ADMIN_ROLE_NAME } });
  if (!platformRole) {
    platformRole = await prisma.role.create({
      data: { shopId: null, roleName: PLATFORM_ADMIN_ROLE_NAME, description: "Full platform-level access." },
    });
    const platformPermissions = await prisma.permission.findMany({ where: { module: "Platform" } });
    await prisma.rolePermission.createMany({
      data: platformPermissions.map((p) => ({ roleId: platformRole!.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    console.log(`Created "${PLATFORM_ADMIN_ROLE_NAME}" role.`);
  }
  console.log(
    "Run `npm run prisma:seed` next (it's shop-aware and idempotent) to create the platform admin login.",
  );

  // 6. Non-expiring "Legacy Access" subscription for the migrated shop.
  const existingSubscription = await prisma.subscription.findFirst({ where: { shopId } });
  if (!existingSubscription) {
    const legacyPlan = await prisma.subscriptionPlan.upsert({
      where: { name: "Legacy Access" },
      update: {},
      create: {
        name: "Legacy Access",
        description: "Manually-managed, non-expiring access predating online billing.",
        price: 0,
        billingInterval: "CUSTOM",
        durationDays: 0,
        isTrial: false,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        shopId,
        planId: legacyPlan.id,
        status: "ACTIVE",
        startDate: shop.createdAt,
        endDate: null,
        amount: 0,
        paymentStatus: "NOT_REQUIRED",
      },
    });
    console.log(`Created a non-expiring "Legacy Access" subscription for the Default Shop.`);
  }

  // 7. Audit trail for the migration itself.
  await prisma.auditLog.create({
    data: {
      shopId: null,
      module: "Platform",
      action: "MULTI_TENANCY_BACKFILL",
      description: `Migrated existing single-tenant data into Default Shop (${shop.id}).`,
    },
  });

  // 8. Verify - zero remaining NULL shopId on any tenant table (User/Role
  // are expected to still have legitimate NULLs, reserved for Platform
  // Admin accounts/roles; AuditLog/Setting/Notification also keep NULL as
  // a valid platform-level state by design, so they're excluded from this
  // hard-fail check).
  console.log("\nVerifying backfill completeness...");
  let allClear = true;
  for (const model of TENANT_MODELS) {
    if (model === "auditLog" || model === "setting" || model === "notification") continue;
    const delegate = (prisma as AnyPrisma)[model];
    const remaining = await delegate.count({ where: { shopId: null } });
    if (remaining > 0) {
      allClear = false;
      console.error(`  x ${model}: ${remaining} row(s) still have a NULL shopId`);
    }
  }

  if (!allClear) {
    console.error(
      "\nBackfill incomplete - do NOT proceed to the NOT-NULL/constraints migration until every " +
        "row above is resolved. Re-run this script after investigating.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nBackfill complete and verified. Safe to apply the NOT NULL + composite-unique migration next.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
