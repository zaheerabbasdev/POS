import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/common/utils/password.js";

/**
 * Increment 3 — admin/enforcement smoke tests, alongside
 * tests/tenant-isolation.test.ts:
 *   1. A regular shop user (no PLATFORM_* permissions) is blocked from the
 *      admin shops API.
 *   2. A shop whose trial has expired gets its operational (write) routes
 *      blocked (403), while read routes and /subscription keep working.
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

const NEEDED_PERMISSIONS = [
  { code: "SALE_VIEW", module: "Sales", description: "View sales" },
  { code: "SALE_CREATE", module: "Sales", description: "Create sales" },
];

const createdShopIds: string[] = [];
const createdRoleIds: string[] = [];
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

interface ShopFixture {
  shopId: string;
  username: string;
}

async function createShopFixture(label: string, subscriptionEndDate: Date | null, subscriptionStatus: "TRIAL" | "EXPIRED"): Promise<ShopFixture> {
  const shop = await prisma.shop.create({
    data: { name: `Operational Access Test Shop ${label} ${RUN_ID}`, status: "ACTIVE" },
  });
  createdShopIds.push(shop.id);

  const role = await prisma.role.create({
    data: { shopId: shop.id, roleName: `Test Role ${label}`, description: "Operational access test fixture role." },
  });
  createdRoleIds.push(role.id);

  const permissionRows = await prisma.permission.findMany({
    where: { permissionName: { in: NEEDED_PERMISSIONS.map((p) => p.code) } },
  });
  await prisma.rolePermission.createMany({
    data: permissionRows.map((p) => ({ roleId: role.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  const username = `op_access_test_${label.toLowerCase()}_${RUN_ID}`;
  const hashed = await hashPassword(PASSWORD);
  const user = await prisma.user.create({
    data: { username, password: hashed, shopId: shop.id, roles: { create: { roleId: role.id } } },
  });
  createdUserIds.push(user.id);

  const plan = await prisma.subscriptionPlan.upsert({
    where: { name: "Free Trial" },
    update: {},
    create: { name: "Free Trial", price: 0, billingInterval: "CUSTOM", durationDays: 30, isTrial: true, isActive: true },
  });
  await prisma.subscription.create({
    data: {
      shopId: shop.id,
      planId: plan.id,
      status: subscriptionStatus,
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      endDate: subscriptionEndDate,
      amount: 0,
      paymentStatus: "NOT_REQUIRED",
    },
  });

  return { shopId: shop.id, username };
}

async function loginAgent(username: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").send({ username, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
}

let activeShop: ShopFixture;
let expiredShop: ShopFixture;

beforeAll(async () => {
  await ensurePermissions();
  activeShop = await createShopFixture("Active", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "TRIAL");
  expiredShop = await createShopFixture("Expired", new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), "TRIAL");
});

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { shopId: { in: createdShopIds } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: createdRoleIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
  await prisma.shop.deleteMany({ where: { id: { in: createdShopIds } } });
  await prisma.$disconnect();
});

describe("admin shops API — access control", () => {
  it("a regular shop user (no PLATFORM_* permissions) is blocked from /admin/shops", async () => {
    const agent = await loginAgent(activeShop.username);
    const res = await agent.get("/api/v1/admin/shops");
    expect(res.status).toBe(403);
  });
});

describe("requireOperationalAccess", () => {
  it("an active (non-expired) trial shop can hit a write route's permission/operational gate (past 403, reaches validation)", async () => {
    const agent = await loginAgent(activeShop.username);
    const res = await agent.post("/api/v1/sales").send({});
    // Not blocked by requireOperationalAccess — falls through to body
    // validation (422), proving the operational gate let it pass.
    expect(res.status).not.toBe(403);
  });

  it("an expired-trial shop is blocked (403) from creating a sale", async () => {
    const agent = await loginAgent(expiredShop.username);
    const res = await agent.post("/api/v1/sales").send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TRIAL_EXPIRED");
  });

  it("an expired-trial shop can still read (GET /sales)", async () => {
    const agent = await loginAgent(expiredShop.username);
    const res = await agent.get("/api/v1/sales");
    expect(res.status).toBe(200);
  });

  it("an expired-trial shop can still see its own subscription status", async () => {
    const agent = await loginAgent(expiredShop.username);
    const res = await agent.get("/api/v1/subscription");
    expect(res.status).toBe(200);
    expect(res.body.data.isExpired).toBe(true);
  });
});
