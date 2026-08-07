import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

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

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

interface RoleSeed {
  name: string;
  description: string;
  permissions: string[];
}

// Default roles (SRS Chapter 9) with the permission grants listed under
// each role's "X Permissions" bullet list in that same chapter.
const ROLES: RoleSeed[] = [
  { name: "Owner", description: "Full system access.", permissions: ALL_PERMISSION_CODES },
  {
    name: "Manager",
    description: "Manages products, sales, purchases, customers, and suppliers; views reports.",
    permissions: [
      "PRODUCT_VIEW",
      "PRODUCT_MANAGE",
      "INVENTORY_VIEW",
      "SALE_VIEW",
      "SALE_CREATE",
      "SALE_CANCEL",
      "PURCHASE_VIEW",
      "PURCHASE_CREATE",
      "PURCHASE_RETURN",
      "PAYMENT_VIEW",
      "PAYMENT_MANAGE",
      "CASH_DRAWER_VIEW",
      "CASH_DRAWER_MANAGE",
      "CUSTOMER_VIEW",
      "CUSTOMER_MANAGE",
      "SUPPLIER_VIEW",
      "SUPPLIER_MANAGE",
      "REPORT_VIEW",
    ],
  },
  {
    name: "Cashier",
    description: "Sales and customer transactions.",
    permissions: [
      "SALE_VIEW",
      "SALE_CREATE",
      "SALE_CANCEL",
      "PAYMENT_MANAGE",
      "CASH_DRAWER_VIEW",
      "CASH_DRAWER_MANAGE",
      "CUSTOMER_VIEW",
      "CUSTOMER_MANAGE",
      "PRODUCT_VIEW",
      "INVENTORY_VIEW",
    ],
  },
  {
    name: "Inventory Staff",
    description: "Inventory and purchases.",
    permissions: [
      "PRODUCT_VIEW",
      "PRODUCT_MANAGE",
      "INVENTORY_VIEW",
      "INVENTORY_MANAGE",
      "PURCHASE_VIEW",
      "PURCHASE_CREATE",
      "PURCHASE_RETURN",
      "PAYMENT_MANAGE",
      "SUPPLIER_VIEW",
      "SUPPLIER_MANAGE",
    ],
  },
  {
    name: "Technician",
    description: "Repair management.",
    permissions: ["REPAIR_VIEW", "REPAIR_MANAGE", "WARRANTY_VIEW", "WARRANTY_MANAGE"],
  },
  {
    name: "Accountant",
    description: "Financial reports and expenses.",
    permissions: ["EXPENSE_VIEW", "EXPENSE_MANAGE", "PAYMENT_VIEW", "REPORT_VIEW", "REPORT_EXPORT"],
  },
];

// Module 21 – Expense Management's fixed "Expense Categories" list.
const EXPENSE_CATEGORIES = [
  "Shop Rent",
  "Electricity",
  "Internet",
  "Salaries",
  "Maintenance",
  "Marketing",
  "Transportation",
  "Office Supplies",
  "Miscellaneous",
];

const SEED_ADMIN_USERNAME = "admin";
const SEED_ADMIN_PASSWORD = "Admin@12345";

async function main(): Promise<void> {
  console.log("Seeding permissions...");
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { permissionName: permission.code },
      update: { module: permission.module, description: permission.description },
      create: { permissionName: permission.code, module: permission.module, description: permission.description },
    });
  }

  console.log("Seeding roles...");
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { roleName: roleDef.name },
      update: { description: roleDef.description },
      create: { roleName: roleDef.name, description: roleDef.description },
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

  console.log("Seeding expense categories...");
  for (const categoryName of EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { categoryName },
      update: {},
      create: { categoryName },
    });
  }

  console.log("Seeding default admin user...");
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { roleName: "Owner" } });
  const existingAdmin = await prisma.user.findUnique({ where: { username: SEED_ADMIN_USERNAME } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        username: SEED_ADMIN_USERNAME,
        email: "admin@mobileshop.local",
        password: hashedPassword,
        roles: { create: { roleId: ownerRole.id } },
      },
    });
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
