import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { DEFAULT_SHOP_ROLES, DEFAULT_EXPENSE_CATEGORIES } from "../src/common/constants/defaultRoles.js";

// Standalone script — deliberately doesn't import src/config/prisma.ts so it
// has no dependency on the app's tsconfig rootDir/include.
const adapter = new PrismaPg({ connectionString: process.env["DIRECT_DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

interface PermissionSeed {
  code: string;
  module: string;
  description: string;
}

// One VIEW/MANAGE pair per module that's actually implemented so far, plus
// the finer-grained codes the API Spec's own example uses (SALE_CREATE,
// SALE_VIEW, CUSTOMER_VIEW — Chapter 22.3). Finer-grained Create/Update/
// Delete splits can be added module-by-module as each one is actually built
// instead of seeding permissions for endpoints that don't exist yet.
const PERMISSIONS: PermissionSeed[] = [
  { code: "USER_VIEW", module: "Users", description: "View system users" },
  { code: "USER_MANAGE", module: "Users", description: "Create, update, and deactivate system users" },
  { code: "ROLE_MANAGE", module: "Roles", description: "Manage roles and permission assignments" },
  { code: "PRODUCT_VIEW", module: "Products", description: "View products" },
  { code: "PRODUCT_MANAGE", module: "Products", description: "Create, update, and delete products" },
  { code: "INVENTORY_VIEW", module: "Inventory", description: "View stock levels" },
  { code: "INVENTORY_MANAGE", module: "Inventory", description: "Adjust stock and record stock movements" },
  { code: "SALE_VIEW", module: "Sales", description: "View sales and invoices" },
  { code: "SALE_CREATE", module: "Sales", description: "Create sales / process POS billing" },
  { code: "SALE_CANCEL", module: "Sales", description: "Cancel or return sales" },
  { code: "PURCHASE_VIEW", module: "Purchases", description: "View purchase orders" },
  { code: "PURCHASE_CREATE", module: "Purchases", description: "Record supplier purchases" },
  { code: "PURCHASE_RETURN", module: "Purchases", description: "Return purchased stock back to suppliers" },
  { code: "PAYMENT_VIEW", module: "Payments", description: "View customer and supplier payments" },
  { code: "PAYMENT_MANAGE", module: "Payments", description: "Record additional payments against sales/purchases" },
  { code: "CASH_DRAWER_VIEW", module: "Cash Drawer", description: "View cash drawer sessions and summaries" },
  {
    code: "CASH_DRAWER_MANAGE",
    module: "Cash Drawer",
    description: "Open/close the cash drawer and record cash in/out",
  },
  { code: "CUSTOMER_VIEW", module: "Customers", description: "View customer records" },
  { code: "CUSTOMER_MANAGE", module: "Customers", description: "Create and update customer records" },
  { code: "SUPPLIER_VIEW", module: "Suppliers", description: "View supplier records" },
  { code: "SUPPLIER_MANAGE", module: "Suppliers", description: "Create and update supplier records" },
  { code: "REPAIR_VIEW", module: "Repairs", description: "View repair tickets" },
  { code: "REPAIR_MANAGE", module: "Repairs", description: "Create and update repair tickets" },
  { code: "WARRANTY_VIEW", module: "Warranties", description: "View warranty records" },
  { code: "WARRANTY_MANAGE", module: "Warranties", description: "Register and process warranty claims" },
  { code: "EXPENSE_VIEW", module: "Expenses", description: "View business expenses" },
  { code: "EXPENSE_MANAGE", module: "Expenses", description: "Record business expenses" },
  { code: "EMPLOYEE_VIEW", module: "Employees", description: "View employee records" },
  { code: "EMPLOYEE_MANAGE", module: "Employees", description: "Create and update employee records" },
  { code: "REPORT_VIEW", module: "Reports", description: "View business reports" },
  { code: "REPORT_EXPORT", module: "Reports", description: "Export reports to PDF/Excel" },
  { code: "SETTINGS_VIEW", module: "Settings", description: "View system settings" },
  { code: "SETTINGS_MANAGE", module: "Settings", description: "Change system settings" },
  { code: "AUDIT_VIEW", module: "Audit", description: "View audit logs" },
];

// Multi-tenancy — platform-level permissions (module = "Platform"), separate
// from the shop-level codes above. Guard Platform Admin's /admin/* routes;
// never granted to a shop-level role.
const PLATFORM_PERMISSIONS: PermissionSeed[] = [
  { code: "PLATFORM_DASHBOARD_VIEW", module: "Platform", description: "View the platform admin dashboard" },
  { code: "PLATFORM_SHOP_VIEW", module: "Platform", description: "View shops" },
  { code: "PLATFORM_SHOP_CREATE", module: "Platform", description: "Create new shops" },
  { code: "PLATFORM_SHOP_UPDATE", module: "Platform", description: "Update shop details" },
  { code: "PLATFORM_SHOP_SUSPEND", module: "Platform", description: "Suspend a shop" },
  { code: "PLATFORM_SHOP_ACTIVATE", module: "Platform", description: "Reactivate a suspended shop" },
  { code: "PLATFORM_SHOP_DELETE", module: "Platform", description: "Delete/archive a shop" },
  { code: "PLATFORM_USER_VIEW", module: "Platform", description: "View platform admin users" },
  { code: "PLATFORM_USER_MANAGE", module: "Platform", description: "Manage platform admin users" },
  { code: "PLATFORM_PLAN_VIEW", module: "Platform", description: "View subscription plans" },
  { code: "PLATFORM_PLAN_MANAGE", module: "Platform", description: "Create and edit subscription plans" },
  { code: "PLATFORM_SUBSCRIPTION_VIEW", module: "Platform", description: "View shop subscriptions" },
  { code: "PLATFORM_SUBSCRIPTION_MANAGE", module: "Platform", description: "Change a shop's subscription" },
  { code: "PLATFORM_TRIAL_EXTEND", module: "Platform", description: "Extend a shop's free trial" },
  { code: "PLATFORM_BILLING_VIEW", module: "Platform", description: "View platform billing information" },
  { code: "PLATFORM_REPORT_VIEW", module: "Platform", description: "View platform-wide reports" },
  { code: "PLATFORM_REPORT_EXPORT", module: "Platform", description: "Export platform-wide reports" },
  { code: "PLATFORM_AUDIT_VIEW", module: "Platform", description: "View platform-level audit log entries" },
  { code: "PLATFORM_SETTINGS_MANAGE", module: "Platform", description: "Change platform-level settings" },
];

const ALL_PLATFORM_PERMISSION_CODES = PLATFORM_PERMISSIONS.map((p) => p.code);

// Default shop-level roles + expense categories now live in
// common/constants/defaultRoles.ts, shared with the app runtime
// (registration, admin-created shops) — see that file's header comment.
const ROLES = DEFAULT_SHOP_ROLES;
const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;

const SEED_DEFAULT_SHOP_NAME = "Default Shop";
const SEED_ADMIN_USERNAME = "admin";
const SEED_ADMIN_PASSWORD = "Admin@12345";
const SEED_PLATFORM_ADMIN_USERNAME = "platformadmin";
const SEED_PLATFORM_ADMIN_PASSWORD = "Platform@12345";

/**
 * Seeds one shop's own copy of the 6 default roles (each shop's roles are
 * fully independent/editable — see schema.prisma's Role model comment).
 * Reusable both by this fresh-dev-DB seed and, later, by shop registration
 * (Phase 7) and admin-created shops (Phase 21) — same shape, different
 * caller.
 */
async function seedShopRoles(shopId: string): Promise<void> {
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { shopId_roleName: { shopId, roleName: roleDef.name } },
      update: { description: roleDef.description },
      create: { shopId, roleName: roleDef.name, description: roleDef.description },
    });

    const permissions = await prisma.permission.findMany({
      where: { permissionName: { in: roleDef.permissions } },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

async function main(): Promise<void> {
  console.log("Seeding permissions...");
  for (const permission of [...PERMISSIONS, ...PLATFORM_PERMISSIONS]) {
    await prisma.permission.upsert({
      where: { permissionName: permission.code },
      update: { module: permission.module, description: permission.description },
      create: { permissionName: permission.code, module: permission.module, description: permission.description },
    });
  }

  // --- Platform level (shopId = NULL) ---------------------------------
  // Prisma can't use `upsert` against a compound unique key that includes a
  // NULL field (shopId IS NULL isn't a usable equality lookup) — find/then
  // create-or-update instead, same pattern as backfill-default-shop.ts.
  console.log("Seeding Platform Admin role...");
  const existingPlatformRole = await prisma.role.findFirst({
    where: { shopId: null, roleName: "Platform Admin" },
  });
  const platformAdminRole = existingPlatformRole
    ? await prisma.role.update({
        where: { id: existingPlatformRole.id },
        data: { description: "Full platform-level access." },
      })
    : await prisma.role.create({
        data: { shopId: null, roleName: "Platform Admin", description: "Full platform-level access." },
      });
  const platformPermissionRows = await prisma.permission.findMany({
    where: { permissionName: { in: ALL_PLATFORM_PERMISSION_CODES } },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: platformAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: platformPermissionRows.map((p) => ({ roleId: platformAdminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  console.log("Seeding default platform admin user...");
  const existingPlatformAdmin = await prisma.user.findUnique({ where: { username: SEED_PLATFORM_ADMIN_USERNAME } });
  if (!existingPlatformAdmin) {
    const hashedPassword = await bcrypt.hash(SEED_PLATFORM_ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        username: SEED_PLATFORM_ADMIN_USERNAME,
        email: "platformadmin@mobileshop.local",
        password: hashedPassword,
        shopId: null,
        roles: { create: { roleId: platformAdminRole.id } },
      },
    });
    console.log(
      `Created platform admin user — username: "${SEED_PLATFORM_ADMIN_USERNAME}", password: "${SEED_PLATFORM_ADMIN_PASSWORD}"`,
    );
    console.log("⚠ Change this password immediately after first login.");
  } else {
    console.log(`Platform admin user "${SEED_PLATFORM_ADMIN_USERNAME}" already exists — skipped.`);
  }

  // --- Shop level -------------------------------------------------------
  // A fresh dev DB has no shop yet — create one so `admin`/the seeded roles
  // have somewhere to belong. (An already-populated database that's being
  // converted to multi-tenant, e.g. an existing production DB, uses
  // prisma/backfill-default-shop.ts instead — a separate script, since that
  // case has to migrate *existing* rows rather than create fresh ones.)
  console.log("Seeding default shop...");
  // Any existing shop (however it was created — by this seed script on a
  // prior run, or by prisma/backfill-default-shop.ts migrating a populated
  // database) counts as "already bootstrapped" — don't match on name, a
  // backfilled shop is very likely named after the real shop, not this
  // placeholder constant.
  let shop = await prisma.shop.findFirst({ orderBy: { createdAt: "asc" } });
  if (!shop) {
    shop = await prisma.shop.create({
      data: { name: SEED_DEFAULT_SHOP_NAME, status: "ACTIVE" },
    });
  }

  console.log("Seeding default shop's subscription...");
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
  const existingSubscription = await prisma.subscription.findFirst({ where: { shopId: shop.id } });
  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        shopId: shop.id,
        planId: legacyPlan.id,
        status: "ACTIVE",
        startDate: new Date(),
        endDate: null,
        amount: 0,
        paymentStatus: "NOT_REQUIRED",
      },
    });
  }

  console.log("Seeding shop roles...");
  await seedShopRoles(shop.id);

  console.log("Seeding expense categories...");
  for (const categoryName of EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { shopId_categoryName: { shopId: shop.id, categoryName } },
      update: {},
      create: { shopId: shop.id, categoryName },
    });
  }

  console.log("Seeding default admin user...");
  const ownerRole = await prisma.role.findFirstOrThrow({ where: { shopId: shop.id, roleName: "Owner" } });
  const existingAdmin = await prisma.user.findUnique({ where: { username: SEED_ADMIN_USERNAME } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
    const admin = await prisma.user.create({
      data: {
        username: SEED_ADMIN_USERNAME,
        email: "admin@mobileshop.local",
        password: hashedPassword,
        shopId: shop.id,
        roles: { create: { roleId: ownerRole.id } },
      },
    });
    if (!shop.ownerId) {
      await prisma.shop.update({ where: { id: shop.id }, data: { ownerId: admin.id } });
    }
    console.log(`Created default admin user — username: "${SEED_ADMIN_USERNAME}", password: "${SEED_ADMIN_PASSWORD}"`);
    console.log("⚠ Change this password immediately after first login.");
  } else {
    console.log(`Admin user "${SEED_ADMIN_USERNAME}" already exists — skipped.`);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
