// The 6 default shop-level roles (SRS Chapter 9) every new shop gets its own
// editable copy of — see schema.prisma's Role model comment. Plain data, no
// Prisma import, so both the app (registration, admin-created shops) and the
// standalone `prisma/seed.ts` script (which deliberately avoids importing
// anything that pulls in the app's Prisma client, for tsconfig-rootDir
// reasons — see that file's own header comment) can import this one file
// without either side re-typing the list and drifting out of sync.

export interface DefaultRoleDefinition {
  name: string;
  description: string;
  permissions: string[];
}

export const DEFAULT_SHOP_PERMISSION_CODES = [
  "USER_VIEW",
  "USER_MANAGE",
  "ROLE_MANAGE",
  "PRODUCT_VIEW",
  "PRODUCT_MANAGE",
  "INVENTORY_VIEW",
  "INVENTORY_MANAGE",
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
  "REPAIR_VIEW",
  "REPAIR_MANAGE",
  "WARRANTY_VIEW",
  "WARRANTY_MANAGE",
  "EXPENSE_VIEW",
  "EXPENSE_MANAGE",
  "EMPLOYEE_VIEW",
  "EMPLOYEE_MANAGE",
  "REPORT_VIEW",
  "REPORT_EXPORT",
  "SETTINGS_VIEW",
  "SETTINGS_MANAGE",
  "AUDIT_VIEW",
];

export const DEFAULT_SHOP_ROLES: DefaultRoleDefinition[] = [
  { name: "Owner", description: "Full system access.", permissions: DEFAULT_SHOP_PERMISSION_CODES },
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

// Module 21 – Expense Management's fixed "Expense Categories" list. Shared for
// the same reason as the roles above — every new shop (registration,
// admin-created, or the seed script's own Default Shop) gets the same set.
export const DEFAULT_EXPENSE_CATEGORIES = [
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
