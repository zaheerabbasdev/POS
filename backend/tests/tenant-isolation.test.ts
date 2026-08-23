import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/common/utils/password.js";

/**
 * Multi-tenancy — tenant isolation smoke test (increment 1's required
 * automated safety net). Spins up the real Express app and two independent
 * shops with their own Owner-equivalent user, then asserts Shop B's user
 * can never read, list, or discover the existence of Shop A's data — the
 * single most important guarantee this migration makes.
 *
 * Uses TEST_DATABASE_URL if set, otherwise falls back to
 * DIRECT_DATABASE_URL (see backend/.env.example) — every row this suite
 * creates uses a random suffix and is deleted in afterAll, so sharing the
 * dev database is safe, just not parallel-safe (see vitest.config.ts's
 * fileParallelism: false).
 */

const testDbUrl = process.env["TEST_DATABASE_URL"] || process.env["DIRECT_DATABASE_URL"];
if (!testDbUrl) {
  throw new Error("TEST_DATABASE_URL or DIRECT_DATABASE_URL must be set to run the test suite.");
}
const adapter = new PrismaPg({ connectionString: testDbUrl });
const prisma = new PrismaClient({ adapter });

const app = createApp();

const RUN_ID = randomUUID().slice(0, 8);
const PASSWORD = "TestPass@123";

// Permission codes the test's shop-scoped role needs — enough to exercise
// Products, Customers, and Sales read paths.
const NEEDED_PERMISSIONS = [
  { code: "PRODUCT_VIEW", module: "Products", description: "View products" },
  { code: "PRODUCT_MANAGE", module: "Products", description: "Manage products" },
  { code: "CUSTOMER_VIEW", module: "Customers", description: "View customers" },
  { code: "CUSTOMER_MANAGE", module: "Customers", description: "Manage customers" },
  { code: "SALE_VIEW", module: "Sales", description: "View sales" },
];

interface ShopFixture {
  shopId: string;
  username: string;
  productId: string;
  customerId: string;
  saleId: string;
}

let shopA: ShopFixture;
let shopB: ShopFixture;
const createdRoleIds: string[] = [];
const createdShopIds: string[] = [];
const createdUserIds: string[] = [];

async function ensurePermissions(): Promise<void> {
  for (const p of NEEDED_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { permissionName: p.code },
      update: {},
      create: { permissionName: p.code, module: p.module, description: p.description },
    });
  }
}

async function createShopFixture(label: "A" | "B"): Promise<ShopFixture> {
  const shop = await prisma.shop.create({
    data: { name: `Tenant Isolation Test Shop ${label} ${RUN_ID}`, status: "ACTIVE" },
  });
  createdShopIds.push(shop.id);

  const role = await prisma.role.create({
    data: { shopId: shop.id, roleName: `Test Role ${label}`, description: "Isolation test fixture role." },
  });
  createdRoleIds.push(role.id);

  const permissionRows = await prisma.permission.findMany({
    where: { permissionName: { in: NEEDED_PERMISSIONS.map((p) => p.code) } },
  });
  await prisma.rolePermission.createMany({
    data: permissionRows.map((p) => ({ roleId: role.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  const username = `tenant_test_${label.toLowerCase()}_${RUN_ID}`;
  const hashed = await hashPassword(PASSWORD);
  const user = await prisma.user.create({
    data: { username, password: hashed, shopId: shop.id, roles: { create: { roleId: role.id } } },
  });
  createdUserIds.push(user.id);
  await prisma.shop.update({ where: { id: shop.id }, data: { ownerId: user.id } });

  const category = await prisma.category.create({
    data: { shopId: shop.id, categoryName: `Test Category ${label} ${RUN_ID}` },
  });
  const product = await prisma.product.create({
    data: {
      shopId: shop.id,
      sku: `TEST-SKU-${label}-${RUN_ID}`,
      productName: `Test Product ${label}`,
      categoryId: category.id,
      purchasePrice: 100,
      sellingPrice: 150,
    },
  });

  const customer = await prisma.customer.create({
    data: {
      shopId: shop.id,
      customerCode: `TEST-CUST-${label}-${RUN_ID}`,
      firstName: `Test`,
      lastName: `Customer ${label}`,
    },
  });

  const sale = await prisma.sale.create({
    data: {
      shopId: shop.id,
      invoiceNumber: `TEST-INV-${label}-${RUN_ID}`,
      saleDate: new Date(),
      totalAmount: 150,
    },
  });

  return { shopId: shop.id, username, productId: product.id, customerId: customer.id, saleId: sale.id };
}

async function loginAgent(username: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").send({ username, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
}

beforeAll(async () => {
  await ensurePermissions();
  shopA = await createShopFixture("A");
  shopB = await createShopFixture("B");
});

afterAll(async () => {
  // Children before parents — every row here was created by this suite.
  await prisma.sale.deleteMany({ where: { shopId: { in: createdShopIds } } });
  await prisma.customer.deleteMany({ where: { shopId: { in: createdShopIds } } });
  await prisma.inventory.deleteMany({ where: { shopId: { in: createdShopIds } } });
  await prisma.product.deleteMany({ where: { shopId: { in: createdShopIds } } });
  await prisma.category.deleteMany({ where: { shopId: { in: createdShopIds } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: createdRoleIds } } });
  await prisma.shop.updateMany({ where: { id: { in: createdShopIds } }, data: { ownerId: null } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
  await prisma.shop.deleteMany({ where: { id: { in: createdShopIds } } });
  await prisma.$disconnect();
});

describe("multi-tenancy: cross-shop isolation", () => {
  it("Shop A's user can see Shop A's own product (sanity/positive control)", async () => {
    const agentA = await loginAgent(shopA.username);
    const res = await agentA.get(`/api/v1/products/${shopA.productId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(shopA.productId);
  });

  it("Shop B cannot list Shop A's products", async () => {
    const agentB = await loginAgent(shopB.username);
    const res = await agentB.get("/api/v1/products").query({ limit: 100 });
    expect(res.status).toBe(200);
    const ids = (res.body.data as { id: string }[]).map((p) => p.id);
    expect(ids).not.toContain(shopA.productId);
    expect(ids).toContain(shopB.productId);
  });

  it("Shop B gets 404 (not 200 or 403) reading Shop A's product by id", async () => {
    const agentB = await loginAgent(shopB.username);
    const res = await agentB.get(`/api/v1/products/${shopA.productId}`);
    expect(res.status).toBe(404);
  });

  it("Shop B cannot update Shop A's product", async () => {
    const agentB = await loginAgent(shopB.username);
    const res = await agentB.patch(`/api/v1/products/${shopA.productId}`).send({ name: "Hijacked" });
    expect(res.status).toBe(404);
  });

  it("Shop B cannot list Shop A's customers", async () => {
    const agentB = await loginAgent(shopB.username);
    const res = await agentB.get("/api/v1/customers").query({ limit: 100 });
    expect(res.status).toBe(200);
    const ids = (res.body.data as { id: string }[]).map((c) => c.id);
    expect(ids).not.toContain(shopA.customerId);
    expect(ids).toContain(shopB.customerId);
  });

  it("Shop B gets 404 reading Shop A's customer by id", async () => {
    const agentB = await loginAgent(shopB.username);
    const res = await agentB.get(`/api/v1/customers/${shopA.customerId}`);
    expect(res.status).toBe(404);
  });

  it("Shop B cannot list Shop A's sales", async () => {
    const agentB = await loginAgent(shopB.username);
    const res = await agentB.get("/api/v1/sales").query({ limit: 100 });
    expect(res.status).toBe(200);
    const ids = (res.body.data as { id: string }[]).map((s) => s.id);
    expect(ids).not.toContain(shopA.saleId);
    expect(ids).toContain(shopB.saleId);
  });
});
