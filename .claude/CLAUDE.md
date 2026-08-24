# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Mobile Shop POS** — a web-based Point-of-Sale and inventory management
system for a mobile phone retail shop. Covers the full retail loop: product
catalog (with per-unit IMEI tracking for phones), purchasing from suppliers,
selling at a POS counter, inventory, cash drawer sessions, customer/supplier
ledgers, repairs, warranties, expenses, reporting/export, and admin
(users/roles/permissions, audit log).

Two independent apps in one repo, **no monorepo tooling** (no workspaces, no
shared package) — `backend/` and `frontend/` each have their own
`package.json`, `node_modules`, and git-ignored `.env`, and are run/deployed
separately.

Requirements source: `req/POS Doc.docx` (a 6-volume BRD/SRS/DDD/SAD/UI-UX/API
spec), extracted to `req/POS_Doc_extracted.txt`.

### Documentation map

| File | Contents |
|---|---|
| `PROJECT_DOCUMENTATION.md` | The deepest technical reference: full DB schema/domain map, deliberate deviations from the DDD spec (each tagged `// Not in DDD Table N — ...` in `schema.prisma`), architecture rationale, environment setup, and a "What's Not Built / Known Gaps" log (kept honest — items are marked closed only once actually shipped). |
| `HOW_IT_WORKS.md` | Module-by-module walkthrough from a *user's* perspective — what each screen does, step by step, ending with "the shape of a typical day" tying every module together. |
| `FEATURE_IDEAS.md` | Unbuilt feature backlog (checkbox list, grouped by area). Only check an item off once it's built **and** verified end-to-end. |
| This file | Commands + architecture/API index for an agent working in the code. |

**When you make a change significant enough to affect how the app works** — a
new module, a changed request flow, a new deliberate deviation from the DDD
spec, a closed gap — update the relevant section of `PROJECT_DOCUMENTATION.md`
(and `HOW_IT_WORKS.md` if user-facing behavior changed) *in the same change*,
and keep this file's tables (API list, dependency list, page list) in sync if
they drift.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router), React 19, TypeScript |
| Frontend UI | Tailwind CSS v4 + a shadcn-style component set built on **Base UI** (`@base-ui/react`) — **not Radix** |
| Frontend data/forms | TanStack Query v5 (React Query), TanStack Table v9, `react-hook-form` + `@hookform/resolvers` + `zod` |
| Frontend state | `zustand` (light client state), `axios` for HTTP |
| Frontend extras | `recharts` (report charts), `date-fns` + `react-day-picker` (dates), `lucide-react` (icons), `sonner` (toasts), `class-variance-authority`/`clsx`/`tailwind-merge` (styling utils) |
| Backend framework | Node.js + Express 5, TypeScript (ESM, `module: nodenext`) |
| Backend runtime | `tsx watch` in dev, compiled `tsc` output (`dist/`) in prod |
| Database | PostgreSQL via **Prisma ORM 7**, using the `@prisma/adapter-pg` driver adapter (Prisma 7 dropped the bundled query-engine binary for SQL databases — the adapter is mandatory, not optional) |
| Local dev database | Either a real local PostgreSQL install (this machine: PostgreSQL 18 as a Windows service on port 5432, database `posdb`, managed via pgAdmin) **or** Prisma's self-contained local dev-proxy (`prisma dev`) — both work unchanged, see Environment variables below |
| Auth | JWT (`jsonwebtoken`) in an httpOnly cookie (`pos_token`), `bcrypt` for password hashing, verified server-side on every request |
| Image storage | Cloudinary (`cloudinary` SDK), uploads staged via `multer` |
| PDF/Excel export | `pdfkit` (hand-rolled table layout — no table plugin exists for it), `exceljs` |
| Email | `nodemailer` (Gmail SMTP for password-reset emails; degrades to a logged link if unset) |
| Validation | `zod` on both ends (backend request validation, frontend form validation) — same library, independent schemas |
| Logging | `pino` (+ `pino-pretty` in dev), `morgan` for HTTP access logs |
| Security/ops middleware | `helmet`, `cors`, `cookie-parser`, `express-rate-limit` |
| Backend dev tooling | `eslint`, `prettier`, `nodemon`, `concurrently` (runs `prisma dev` + API together via `npm run dev:all` — only relevant if using the dev-proxy option, not a real local Postgres) |
| Frontend dev tooling | `eslint` (`eslint-config-next`), `shadcn` CLI (`components.json`) |

Exact versions live in `backend/package.json` and `frontend/package.json` —
check those before assuming a version-specific API.

---

## Commands

**Backend** (`cd backend`):
```bash
# If using a real local Postgres install (this machine's setup — Postgres runs
# as a background service, nothing to start manually), skip straight to:
npm run dev                 # tsx watch — API on http://localhost:4000

# If using Prisma's local dev-proxy instead (no local Postgres install):
npx prisma dev            # Terminal 1 — local Postgres-compatible dev server; must be running first
npm run dev                 # Terminal 2 — tsx watch — API on http://localhost:4000
npm run dev:db                # same as `npx prisma dev` (npm script alias)
npm run dev:all                # runs dev:db + dev together via concurrently

npm run build                    # tsc -> dist/
npm run start                     # node dist/server.js (run build first)
npm run typecheck                  # tsc --noEmit
npm run lint                        # eslint src
npm run format                       # prettier --write "src/**/*.ts"
npm run prisma:generate               # regenerate the Prisma client after a schema.prisma change
npm run prisma:migrate                 # apply a new migration (prisma migrate dev)
npm run prisma:seed                     # permissions, roles, expense categories, admin user
npm run prisma:studio                    # Prisma Studio GUI
```
Backend tests: `npm test` (`vitest run`) / `npm run test:watch`. So far this is one
suite, `backend/tests/tenant-isolation.test.ts` — boots the real Express app
(`createApp()`) via `supertest`, creates two isolated shops, and asserts Shop B can
never read/list/update Shop A's data (404, not a leak). Needs a real Postgres
connection: `TEST_DATABASE_URL` if set, else falls back to `DIRECT_DATABASE_URL`
(safe against the shared dev DB — every row is randomly suffixed and cleaned up in
`afterAll`, just not parallel-safe, hence `vitest.config.ts`'s `fileParallelism:
false`). No single-test-file command beyond vitest's own CLI filtering
(`vitest run tests/tenant-isolation.test.ts`).

**Frontend** (`cd frontend`):
```bash
npm run dev     # Next.js dev server — http://localhost:3000
npm run build
npm run start
npm run lint
```

Seeded login after `prisma:seed`: `admin` / `Abc@1234` (seed script warns to
change it immediately; this is the value of `SEED_ADMIN_PASSWORD` in
`backend/prisma/seed.ts` — it only auto-creates the user, so changing that
constant after the user already exists in your DB requires updating the
existing row separately, the seed script skips existing users).

---

## Repository structure

```
pos/
├── req/                          # Requirements doc (source of truth) + extracted text
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Full DB schema (single file)
│   │   ├── migrations/           # One folder per migration, applied in order
│   │   └── seed.ts               # Permissions, roles, expense categories, admin user
│   └── src/
│       ├── server.ts             # Entry point — starts the HTTP server, owns process lifecycle
│       ├── app.ts                # Express app wiring (middleware, routes, error handler)
│       ├── generated/prisma/     # Prisma client output (TS source, not prebuilt JS — don't hand-edit)
│       ├── config/                # env.ts, prisma.ts (client singleton), cloudinary.ts, mailer.ts
│       ├── common/
│       │   ├── constants/         # httpStatus.ts, errorCodes.ts, auth.ts
│       │   ├── errors/AppError.ts # Typed error classes (ValidationError, NotFoundError, …)
│       │   ├── middleware/        # authenticate, authorize, validate, upload, rateLimiter, errorHandler, notFoundHandler, asyncHandler
│       │   ├── utils/              # apiResponse, auditLog, code (SKU/invoice#), duration, jwt, name, pagination, password, paymentMethod, token, userDisplay
│       │   └── types/               # express.d.ts (augments Request with `user`/`validatedQuery`), api-response.types.ts
│       ├── routes/index.ts        # Mounts every module's router under /api/v1
│       └── modules/                # One folder per business domain (27 modules — see API Reference below)
├── frontend/
│   ├── app/
│   │   ├── login/, forgot-password/, reset-password/   # Public auth pages
│   │   ├── print/sales/[id]/, print/repairs/[id]/        # Standalone chrome-free print views
│   │   └── dashboard/              # Everything behind auth — one folder per feature
│   ├── components/
│   │   ├── ui/                     # Base UI–backed primitives (button, dialog, select, table, sidebar, …)
│   │   ├── layout/                 # app-sidebar.tsx, dashboard-header.tsx
│   │   └── *.tsx                   # Shared feature components (see Frontend section below)
│   ├── lib/
│   │   ├── api-client.ts           # axios instance (withCredentials, base URL)
│   │   ├── api/                    # One file per backend module — typed fetch functions (27 files)
│   │   ├── select-items.ts         # Static label maps for Base UI `<Select items={...}>`
│   │   └── utils.ts
│   ├── hooks/                       # use-current-user.ts, use-mobile.ts
│   └── proxy.ts                     # Route protection (Next.js 16's renamed middleware.ts)
├── PROJECT_DOCUMENTATION.md
├── HOW_IT_WORKS.md
└── FEATURE_IDEAS.md
```

### Backend module anatomy

Every one of the 27 backend modules under `backend/src/modules/<name>/`
follows the same shape (validation.ts is omitted only where a module has no
body/query to validate, e.g. `permissions`, `dashboard`):

```
modules/<name>/
  <name>.service.ts      # Business logic + Prisma queries — the only place that touches prisma directly
  <name>.controller.ts   # Thin — pulls req.body/params/validatedQuery, calls the service, sends the response
  <name>.routes.ts        # Express Router — path + method + middleware chain (auth → permission → validate → controller)
  <name>.validation.ts    # zod schemas for params/query/body
  index.ts                 # Re-exports the router — routes/index.ts only ever imports from here
```
(`export/` has one extra file, `export.registry.ts`, mapping each of the 17
report types to its data-fetcher + column layout for PDF/Excel/CSV.)

---

## Backend architecture

**Request flow**: `app.ts` (helmet → cors → cookie-parser →
`express.json`/`urlencoded` → morgan/pino logging → `apiRateLimiter`) →
`/health` or `/api/v1` (`apiRouter`, `routes/index.ts`) → module router →
`authenticate` (verifies the `pos_token` JWT cookie, attaches `req.user`) →
`requirePermission(...)` (checks `req.user.permissions`, re-resolved from the
DB on **every** request — no caching, so a permission edit applies
immediately without logout) → `validate({ params, query, body })` (zod; 422 on
failure; writes coerced values to `req.validatedQuery`, **not** `req.query` —
Express 5's `req.query` is a live getter re-derived from the URL, so mutating
it in place after coercion doesn't persist) → controller → service (Prisma) →
`sendSuccess`/`sendPaginated` → JSON envelope `{ success, message, data,
pagination? }`. Every thrown error is an `AppError` subclass caught by one
`errorHandler` middleware, producing `{ success: false, message, code }` with
the same envelope shape.

**RBAC is permission-code-based, not role-name-based**
(`requirePermission("SALE_CREATE")` — grants access if the user holds *any*
listed code). Roles are just named, editable bundles of permissions,
fully manageable at runtime from Users → Roles in the UI (not fixed at seed
time). See the permission/role tables below.

**Multi-table writes are transactional**: Create Sale, Create Purchase,
Cancel Sale, Sales/Purchase Returns, Stock Adjustment, and Cash Drawer
open/close/cash-in/cash-out are all wrapped in `prisma.$transaction()`. Follow
this pattern for any new operation that must succeed or fail as a unit across
more than one table.

**Audit logging**: `common/utils/auditLog.ts` (`logAudit()` /
`logAuditFromRequest()`) is fire-and-forget (swallows its own errors so a
logging failure never blocks the real mutation). Wired into: user
create/update/deactivate, role create/update/delete/permission-assignment,
password change/reset, sale cancellation, stock adjustments, expense
deletion. Backed by `GET /api/v1/audit-logs` (`AUDIT_VIEW`).

---

## Database

One schema file (`backend/prisma/schema.prisma`). UUID primary keys
everywhere; `snake_case` Postgres columns mapped from `camelCase` Prisma
fields via `@map`. Full field-level detail, key relationships, and every
deliberate deviation from the DDD spec (with rationale) are in
`PROJECT_DOCUMENTATION.md` §5 — summarized here:

**Multi-tenancy**: one shared database, every business table carries a `shopId`
column — see `PROJECT_DOCUMENTATION.md` §5.0 for the full model, and the
"Multi-tenancy" section further below for the request-scoping pattern every module
follows. In progress: schema + every module `shopId`-scoped, public shop
registration + free trial, Platform Admin shop management + trial enforcement
(`requireOperationalAccess`), subscription plan CRUD + shop-side plan selection
(no real payment gateway — plan selection is a manually-managed state change, per
spec §40), and a platform admin dashboard (stat tiles, no charts yet) are all
done. Platform-wide cross-shop reports, dashboard charts, and plan-limit
enforcement are not built yet (see `PROJECT_DOCUMENTATION.md` §11.9).

### Domain groups → models

| Domain | Models |
|---|---|
| Multi-tenancy | `Shop`, `SubscriptionPlan`, `Subscription`, `SubscriptionHistory` |
| Auth & Access | `User`, `PasswordResetToken`, `Role`, `Permission`, `UserRole`, `RolePermission` |
| Employees | `Employee` |
| Product catalog | `Brand`, `Category`, `ProductModel`, `Product`, `ProductImage` |
| Inventory | `ImeiNumber`, `Inventory`, `InventoryTransaction`, `StockAdjustment` |
| Customers & Suppliers | `Customer`, `Supplier` |
| Purchases | `Purchase`, `PurchaseItem`, `PurchaseReturn`, `PurchaseReturnItem` |
| Sales | `Sale`, `SaleItem`, `SalesReturn`, `SalesReturnItem` |
| Payments | `Payment` (polymorphic `referenceId` → `Sale.id` or `Purchase.id`, deliberately not a Prisma relation) |
| Cash Drawer | `CashDrawer`, `CashDrawerTransaction` |
| Repairs | `Repair`, `RepairItem` |
| Warranty | `Warranty` |
| Expenses | `ExpenseCategory`, `Expense` |
| System | `Notification` (schema exists, unused — see gaps), `AuditLog`, `Setting` |

### Enums

| Enum | Values |
|---|---|
| `EmployeeStatus` | ACTIVE, INACTIVE |
| `ImeiStatus` | AVAILABLE, RESERVED, SOLD, RETURNED, UNDER_REPAIR, REPLACED |
| `InventoryTransactionType` | PURCHASE, SALE, SALES_RETURN, PURCHASE_RETURN, ADJUSTMENT, DAMAGE, TRANSFER, REPAIR |
| `CustomerType` | REGULAR, WHOLESALE, VIP, CORPORATE |
| `PurchasePaymentStatus` | PENDING, PARTIAL, PAID |
| `SalePaymentStatus` | PAID, PARTIAL, UNPAID |
| `PaymentType` | SALE_PAYMENT, PURCHASE_PAYMENT, REFUND, SUPPLIER_REFUND |
| `PaymentMethod` | CASH, DEBIT_CARD, CREDIT_CARD, BANK_TRANSFER, MOBILE_WALLET, MIXED_PAYMENT |
| `CashDrawerStatus` | OPEN, CLOSED |
| `CashDrawerTransactionType` | OPENING_BALANCE, SALE, REFUND, EXPENSE, CASH_IN, CASH_OUT, CLOSING_BALANCE |
| `RepairStatus` | RECEIVED, UNDER_INSPECTION, WAITING_FOR_PARTS, IN_PROGRESS, READY_FOR_DELIVERY, DELIVERED, CANCELLED |
| `WarrantyStatus` | ACTIVE, EXPIRED, CLAIMED, CANCELLED |
| `NotificationType` | LOW_STOCK, NEW_SALE, PURCHASE, REPAIR, WARRANTY, PAYMENT, SYSTEM |
| `ShopStatus` | TRIAL, ACTIVE, EXPIRED, SUSPENDED, CANCELLED |
| `SubscriptionStatus` | TRIAL, ACTIVE, EXPIRED, SUSPENDED, CANCELLED, PAST_DUE |
| `SubscriptionPaymentStatus` | NOT_REQUIRED, PENDING, PAID, FAILED |
| `BillingInterval` | MONTHLY, YEARLY, CUSTOM |

### Multi-tenancy — the pattern every module follows

- Every controller calls `getShopId(req)` (`common/middleware/tenant.ts`) first and
  passes `shopId` as the first argument into its service function — never reads a
  client-supplied `shopId` from body/query/params. Throws `TenantAccessDeniedError`
  (403) if the caller is a Platform Admin (`req.user.shopId === null`) hitting a
  shop-scoped route.
- Every service function that touches Prisma takes `shopId: string` first, adds it
  to every `where`/`data`, and uses `findFirst({ where: { id, shopId } })` — never
  `findUnique({ where: { id } })` — for any lookup by a client-supplied id, so a
  valid UUID belonging to another shop 404s exactly like a nonexistent one.
- `User`/`Role` are the only models with a nullable `shopId` among the "direct"
  group (`NULL` = platform-level); `ProductImage`/`PurchaseItem`/`SaleItem`/
  `RepairItem` have no `shopId` column at all — reached only through an
  already-scoped parent id. Every other tenant model has a required `shopId`.
- Reference implementation: `backend/src/modules/products/product.{service,controller}.ts`.

### Relationships worth knowing before touching Sales/Purchases/Inventory

- **`Product.tracksImei`** decides whether a product sells/buys by individual
  IMEI (phones — quantity is always 1 per line) or by plain quantity
  (accessories). Drives IMEI-required validation throughout Purchases/Sales.
- Selling an IMEI-tracked product flips that `ImeiNumber.status` to `SOLD`,
  links it to the `Sale`, and — if the product has `warrantyMonths` set **and**
  the sale has a `Customer` — auto-creates a `Warranty` row.
- **`Inventory` is one row per product** (`quantity`, `availableQuantity`,
  `reservedQuantity`, `reorderLevel`); every quantity change also writes an
  `InventoryTransaction` (type + signed quantity + reference number) — this is
  the audit trail the Inventory page's history view reads from. Inventory
  numbers are never edited directly; they only move as a side effect of
  Purchases, Sales, Returns, Repairs (parts consumption), or a manual
  Adjustment.
- **`CashDrawer`/`CashDrawerTransaction`** track per-cashier register
  sessions; only `CASH`-method sale payments and cash refunds auto-log
  against the cashier's open drawer (best-effort — a missing open session
  never blocks the sale).

---

## Auth & Permissions

- **Login**: `POST /api/v1/auth/login` verifies username/password (bcrypt),
  issues a JWT, sets it as an httpOnly `pos_token` cookie (never returned in
  the JSON body).
- Password reset is anti-enumeration by design — `forgot-password` always
  returns the same generic success message.
- Full seeded permission catalog and default role→permission mapping (seed
  starting point only — both are fully editable at runtime):

| Code | Module |
|---|---|
| `USER_VIEW` / `USER_MANAGE` | Users |
| `ROLE_MANAGE` | Roles & Permissions |
| `PRODUCT_VIEW` / `PRODUCT_MANAGE` | Products, Brands, Categories, Models |
| `INVENTORY_VIEW` / `INVENTORY_MANAGE` | Inventory |
| `SALE_VIEW` / `SALE_CREATE` / `SALE_CANCEL` | Sales, Sales Returns (`SALE_CANCEL` doubles as "cancel or return") |
| `PURCHASE_VIEW` / `PURCHASE_CREATE` / `PURCHASE_RETURN` | Purchases, Purchase Returns |
| `PAYMENT_VIEW` / `PAYMENT_MANAGE` | Payments |
| `CASH_DRAWER_VIEW` / `CASH_DRAWER_MANAGE` | Cash Drawer |
| `CUSTOMER_VIEW` / `CUSTOMER_MANAGE` | Customers |
| `SUPPLIER_VIEW` / `SUPPLIER_MANAGE` | Suppliers |
| `REPAIR_VIEW` / `REPAIR_MANAGE` | Repairs |
| `WARRANTY_VIEW` / `WARRANTY_MANAGE` | Warranties |
| `EXPENSE_VIEW` / `EXPENSE_MANAGE` | Expenses |
| `EMPLOYEE_VIEW` / `EMPLOYEE_MANAGE` | Employees |
| `REPORT_VIEW` / `REPORT_EXPORT` | Reports, Export |
| `SETTINGS_VIEW` / `SETTINGS_MANAGE` | Settings |
| `AUDIT_VIEW` | Audit Log |

| Role | Gets |
|---|---|
| **Owner** | Every permission |
| **Manager** | Products, Inventory (view), Sales, Purchases (+return), Payments, Cash Drawer, Customers, Suppliers, Reports (view) |
| **Cashier** | Sales (+cancel), Payments (manage), Cash Drawer, Customers, Products (view), Inventory (view) |
| **Inventory Staff** | Products, Inventory, Purchases (+return), Payments (manage), Suppliers |
| **Technician** | Repairs, Warranties |
| **Accountant** | Expenses, Payments (view), Reports (view + export) |

---

## API Reference

All endpoints mount under `/api/v1` (see `backend/src/routes/index.ts`).
Every route requires `authenticate` (a valid `pos_token` cookie) unless noted
Public. Permission column lists the codes accepted by that route's
`requirePermission(...)` (any one of them grants access). Verified directly
against each module's `*.routes.ts`.

### Auth — `/auth`
| Method | Path | Permission |
|---|---|---|
| POST | `/login` | Public (rate-limited) |
| POST | `/logout` | authenticated |
| GET | `/me` | authenticated |
| PATCH | `/change-password` | authenticated |
| POST | `/forgot-password` | Public (rate-limited) |
| POST | `/reset-password` | Public (rate-limited) |

### Registration — `/registration` (multi-tenancy)
| Method | Path | Permission |
|---|---|---|
| POST | `/shop` | Public (rate-limited) — creates Shop + Owner + roles + 30-day trial, one transaction; auto-logs in (sets `pos_token`) |

### Subscription — `/subscription` (multi-tenancy)
| Method | Path | Permission |
|---|---|---|
| GET | `/` | authenticated — current shop's plan/status/trial dates |
| GET | `/plans` | authenticated — active, non-trial plans the shop can switch to |
| POST | `/select-plan` | authenticated — `{ planId }`, switches the shop onto it immediately (no payment gateway — `paymentStatus: PENDING` for priced plans, not faked as paid) |

### Admin Subscription Plans — `/admin/subscription-plans` (multi-tenancy, Platform Admin only)
Same `requirePlatformContext` gate as Admin Shops below.

| Method | Path | Permission |
|---|---|---|
| GET | `/` | PLATFORM_PLAN_VIEW, PLATFORM_PLAN_MANAGE |
| POST | `/` | PLATFORM_PLAN_MANAGE — `maxUsers`/`maxProducts` optional, `null`/omitted = unlimited |
| PATCH | `/:id` | PLATFORM_PLAN_MANAGE — includes the `isActive` toggle and `maxUsers`/`maxProducts`; no delete |

Plan limits (`maxUsers`/`maxProducts`, `null` = unlimited) are enforced by
`common/services/planLimits.ts#checkPlanLimit`, called first thing in
`createUser`/`createProduct` — throws `PlanLimitExceededError` (403,
`PLAN_LIMIT_EXCEEDED`) once a shop's active-row count reaches its plan's
limit. Only guards creation, never editing/deactivating an existing row. The
other seven limit/feature fields on `SubscriptionPlan` (`maxMonthlySales`,
`maxBranches`, `maxStorageMb`, `advancedReports`, `imeiTracking`,
`repairsEnabled`, `warrantyEnabled`, `multiBranch`) are schema-only — nothing
reads them yet.

### Admin Shops — `/admin/shops` (multi-tenancy, Platform Admin only)
Router-level `requirePlatformContext` (rejects any caller whose token resolves to a
real shop) on top of the per-route permission below.

| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` | PLATFORM_SHOP_VIEW |
| POST | `/` | PLATFORM_SHOP_CREATE — always grants a 1-month free trial |
| PATCH | `/:id` | PLATFORM_SHOP_UPDATE |
| PATCH | `/:id/suspend` | PLATFORM_SHOP_SUSPEND |
| PATCH | `/:id/activate` | PLATFORM_SHOP_ACTIVATE |
| POST | `/:id/extend-trial` | PLATFORM_TRIAL_EXTEND — `{ days, reason }`, reason required |
| PATCH | `/:id/archive` | PLATFORM_SHOP_DELETE — permanent close (`status: CANCELLED`), not a hard delete; one-way, `activate`/`suspend` reject it afterward |

### Admin Dashboard — `/admin/dashboard` (multi-tenancy, Platform Admin only)
| Method | Path | Permission |
|---|---|---|
| GET | `/summary` | PLATFORM_DASHBOARD_VIEW — shop status-bucket counts (from `Shop.status`, not raw `Subscription` rows), expiring-trial count, total users, this-month new-subscription revenue, 5 most recent shops. No charts yet. |

### Admin Reports — `/admin/reports` (multi-tenancy, Platform Admin only)
| Method | Path | Permission |
|---|---|---|
| GET | `/shops-performance` | PLATFORM_REPORT_VIEW — every shop's lifetime sales/purchase totals + current plan |
| GET | `/subscription-overview` | PLATFORM_REPORT_VIEW — shops-per-plan (current, `distinct`-deduped) + lifetime revenue-per-plan (plain sum). View-only, no export yet. |

### Users — `/users`
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` | USER_VIEW, USER_MANAGE |
| POST | `/` | USER_MANAGE |
| PATCH | `/:id` | USER_MANAGE |
| DELETE | `/:id` (soft-delete/deactivate) | USER_MANAGE |

### Roles — `/roles` · Permissions — `/permissions`
| Method | Path | Permission |
|---|---|---|
| GET | `/roles` , `/roles/:id` | ROLE_MANAGE |
| POST | `/roles` | ROLE_MANAGE |
| PATCH | `/roles/:id` | ROLE_MANAGE |
| POST | `/roles/:id/permissions` (replaces full set) | ROLE_MANAGE |
| DELETE | `/roles/:id` | ROLE_MANAGE |
| GET | `/permissions` (read-only catalog) | ROLE_MANAGE |

### Brands / Categories / Models — `/brands`, `/categories`, `/models`
Identical CRUD shape on all three:
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` | PRODUCT_VIEW, PRODUCT_MANAGE |
| POST | `/` | PRODUCT_MANAGE |
| PATCH | `/:id` | PRODUCT_MANAGE |
| DELETE | `/:id` | PRODUCT_MANAGE |

### Products — `/products`
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` | PRODUCT_VIEW, PRODUCT_MANAGE |
| POST | `/` | PRODUCT_MANAGE |
| PATCH | `/:id` | PRODUCT_MANAGE |
| DELETE | `/:id` | PRODUCT_MANAGE |
| POST | `/:id/image` (Cloudinary upload, first image becomes `isPrimary`) | PRODUCT_MANAGE |

### Inventory — `/inventory`
| Method | Path | Permission |
|---|---|---|
| GET | `/` (filterable by product/category/brand/stock-status) | INVENTORY_VIEW, INVENTORY_MANAGE |
| POST | `/adjustment` (transactional; reason required) | INVENTORY_MANAGE |
| GET | `/:productId/history` | INVENTORY_VIEW, INVENTORY_MANAGE |

### Customers — `/customers`
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` , `/:id/history` | CUSTOMER_VIEW, CUSTOMER_MANAGE |
| POST | `/` | CUSTOMER_MANAGE |
| PATCH | `/:id` | CUSTOMER_MANAGE |

### Suppliers — `/suppliers`
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` , `/:id/history` | SUPPLIER_VIEW, SUPPLIER_MANAGE |
| POST | `/` | SUPPLIER_MANAGE |
| PATCH | `/:id` | SUPPLIER_MANAGE |

### Purchases — `/purchases`
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` | PURCHASE_VIEW, PURCHASE_CREATE |
| POST | `/` (transactional: purchase + items + stock + IMEIs + initial payment) | PURCHASE_CREATE |
| PATCH | `/:id` (supplier/date/remarks only) | PURCHASE_CREATE |
| DELETE | `/:id` (blocked if any stock already moved) | PURCHASE_CREATE |

### Purchase Returns — `/purchase-returns`
| Method | Path | Permission |
|---|---|---|
| GET | `/` | PURCHASE_VIEW, PURCHASE_RETURN |
| POST | `/` (over-return protected) | PURCHASE_RETURN |

### Sales (POS) — `/sales`
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` | SALE_VIEW, SALE_CREATE |
| POST | `/` (transactional: validate stock/IMEI → invoice → stock → IMEI → warranty → payment) | SALE_CREATE |
| PATCH | `/:id/cancel` (full reversal, nothing deleted) | SALE_CANCEL |

### Sales Returns — `/sales-returns`
| Method | Path | Permission |
|---|---|---|
| GET | `/` | SALE_VIEW, SALE_CANCEL |
| POST | `/` (over-return protected, auto-creates REFUND payment) | SALE_CANCEL |

### Payments — `/payments`
| Method | Path | Permission |
|---|---|---|
| GET | `/` | PAYMENT_VIEW, PAYMENT_MANAGE |
| POST | `/` (record additional payment against a sale/purchase) | PAYMENT_MANAGE |
| GET | `/history/:id` | PAYMENT_VIEW, PAYMENT_MANAGE |

### Cash Drawer — `/cash-drawer`
| Method | Path | Permission |
|---|---|---|
| GET | `/` (session history) , `/current` , `/summary` | CASH_DRAWER_VIEW, CASH_DRAWER_MANAGE |
| POST | `/open` , `/close` , `/cash-in` , `/cash-out` | CASH_DRAWER_MANAGE |

### Repairs — `/repairs`
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` | REPAIR_VIEW, REPAIR_MANAGE |
| POST | `/` (device/IMEI as free text) | REPAIR_MANAGE |
| PATCH | `/:id/status` (auto-stamps delivery date; locked after DELIVERED/CANCELLED) | REPAIR_MANAGE |
| PATCH | `/:id` (diagnosis/cost/technician/remarks) | REPAIR_MANAGE |
| POST | `/:id/items` ("Record Parts Used" — decrements real inventory) | REPAIR_MANAGE |

### Warranties — `/warranties`
| Method | Path | Permission |
|---|---|---|
| GET | `/` (filterable by customer/product/status/expiring-within-days) | WARRANTY_VIEW, WARRANTY_MANAGE |
| POST | `/claim` (rejects expired/claimed; auto-opens a linked Repair) | WARRANTY_MANAGE |

### Employees — `/employees`
| Method | Path | Permission |
|---|---|---|
| GET | `/` , `/:id` | EMPLOYEE_VIEW, EMPLOYEE_MANAGE |
| POST | `/` | EMPLOYEE_MANAGE |
| PATCH | `/:id` | EMPLOYEE_MANAGE |
| DELETE | `/:id` (deactivate, keeps history) | EMPLOYEE_MANAGE |

### Expenses — `/expenses`
| Method | Path | Permission |
|---|---|---|
| GET | `/categories` (fixed 9-category seed; unknown ones auto-create) | EXPENSE_VIEW, EXPENSE_MANAGE |
| GET | `/` | EXPENSE_VIEW, EXPENSE_MANAGE |
| POST | `/` | EXPENSE_MANAGE |
| PATCH | `/:id` | EXPENSE_MANAGE |
| DELETE | `/:id` (real delete) | EXPENSE_MANAGE |

### Reports — `/reports` (all GET, read-only)
Gate: `REPORT_VIEW` or `REPORT_EXPORT` on every route below.

| Area | Paths |
|---|---|
| Sales | `/sales/summary`, `/sales/daily`, `/sales/products`, `/sales/employees` |
| Purchases | `/purchases/summary`, `/purchases/suppliers` |
| Inventory | `/inventory/stock`, `/inventory/low-stock`, `/inventory/movement`, `/inventory/imei` |
| Financial | `/financial/profit-loss`, `/financial/expenses`, `/financial/cash-flow` |
| Customers | `/customers/purchases`, `/customers/balance` |
| Suppliers | `/suppliers/balance`, `/suppliers/payments` |

Known simplifications (no per-sale cost snapshot in the schema): "profit"
figures use each product's *current* `purchasePrice`, not true historical
COGS; "cash vs. credit" is inferred from `dueAmount`, not an explicit
payment-method split.

### Export — `/export`
| Method | Path | Permission |
|---|---|---|
| POST | `/report` — `{ reportType, format, filters }`, `format` ∈ `pdf`\|`excel`\|`csv`, `reportType` any of the 17 report paths above | REPORT_EXPORT |

### Uploads — `/uploads`
| Method | Path | Permission |
|---|---|---|
| POST | `/image` — `{ type }` ∈ `product`\|`employee`\|`customer`\|`repair`\|`logo`, checked against the matching `*_MANAGE` permission **inside the controller** (permission depends on body content, which `requirePermission` can't express) | see note |
| DELETE | `/image/:id` (`id` is a `ProductImage` UUID or a composite `type:entityId` string) | see note |

### Settings — `/settings`
| Method | Path | Permission |
|---|---|---|
| GET | `/` (shop branding — read by every role's sidebar) | none (authenticated only) |
| PATCH | `/` | SETTINGS_MANAGE |

### Audit Log — `/audit-logs`
| Method | Path | Permission |
|---|---|---|
| GET | `/` (paginated, filterable by module/action/user/date range) | AUDIT_VIEW |

### Dashboard — `/dashboard`
| Method | Path | Permission |
|---|---|---|
| GET | `/summary` (today's/monthly sales, purchases, revenue, expenses, net profit, counts, low/out-of-stock, pending payments/repairs, 5 most recent sales+purchases) | none (authenticated only — every role lands here after login) |

### Health
`GET /health` — outside `/api/v1`, no auth. Mounted directly in `app.ts`.

---

## Frontend

### Pages (App Router)

**Public**: `/login`, `/register`, `/forgot-password`, `/reset-password`
**Print (chrome-free, outside `/dashboard`)**: `/print/sales/[id]`, `/print/repairs/[id]`
**Platform Admin** (`shopId: null`, own layout/sidebar — `components/tenant-redirect-guard.tsx`
bounces a shop user out of these and a Platform Admin out of `/dashboard`):
`/admin` (dashboard — stat tiles + recent shops), `/admin/shops`, `/admin/shops/new`,
`/admin/shops/[id]`, `/admin/subscription-plans`, `/admin/reports`

**Authenticated**, under `/dashboard`:

| Route | Purpose |
|---|---|
| `/dashboard` | Landing page — stat tiles + recent sales/purchases, auto-refreshes every 60s |
| `/dashboard/pos` | Point-of-sale screen (product search, cart, checkout) |
| `/dashboard/subscription` | Trial/plan status (multi-tenancy) |
| `/dashboard/sales`, `/sales/[id]` | Sales list + detail (payment recording, cancel, return) |
| `/dashboard/purchases`, `/purchases/new`, `/purchases/[id]` | Purchase list, create, detail (edit, return) |
| `/dashboard/cash-drawer` | Open/close, cash in/out, live session summary |
| `/dashboard/expenses` | Expense CRUD |
| `/dashboard/customers`, `/suppliers` | CRUD list + dialog |
| `/dashboard/repairs`, `/repairs/[id]` | Ticket list/create + detail (status, parts, photo) |
| `/dashboard/warranties` | List + one-click claim (opens a linked repair) |
| `/dashboard/reports` | Category-switchable report viewer + per-report export (all 17 types) |
| `/dashboard/products`, `/inventory`, `/brands`, `/categories`, `/models` | Catalog management |
| `/dashboard/users`, `/roles`, `/employees` | Admin |
| `/dashboard/settings` | Shop branding (name/address/phone/email/logo/currency/timezone) |
| `/dashboard/audit-logs` | Audit trail viewer |

Each of the above has a `layout.tsx` guard (`<RequirePermission>`) matching
its backend route's permission — a UX layer only; the backend remains the
real security boundary.

### `lib/api/*.ts` — one typed fetch-function file per backend module

`audit-logs, auth, brands, cash-drawer, categories, customers, dashboard,
employees, expenses, export, inventory, payments, permissions,
product-models, products, purchase-returns, purchases, repairs, reports,
roles, sales-returns, sales, settings, suppliers, uploads, users,
warranties` — all built on `lib/api-client.ts` (axios, `withCredentials:
true`, so the httpOnly cookie rides along automatically).

### Shared components (`components/*.tsx`)

- `image-upload-field.tsx` — thumbnail + Upload/Replace/Remove; backed by a
  *live* per-entity query (not the possibly-stale prop from the parent list),
  used identically for Employee photos, Customer attachments, Repair photos.
- `export-menu.tsx` — PDF/Excel/CSV dropdown, reused on every report card.
- `confirm-dialog.tsx` — shared yes/no confirmation for delete actions.
- `pagination-controls.tsx` — "Showing X–Y of Z" + Prev/Next, wired into
  every paginated list page (Roles is deliberately unpaginated — backend
  `listRoles()` returns a flat array by design).
- `stat-tile.tsx` — dashboard/report KPI tile; carries status via a
  text-token color + icon, never color alone.
- `status-badge.tsx`, `change-password-dialog.tsx`, `require-permission.tsx`,
  `login-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`.
- `components/ui/` — Base UI–backed primitives: alert, avatar, badge, button,
  calendar, card, checkbox, dialog, dropdown-menu, input, select, separator,
  sheet, sidebar, skeleton, table, tabs, textarea, tooltip.
- `components/layout/` — `app-sidebar.tsx` (filters nav items against the
  current user's `permissions[]`), `dashboard-header.tsx`.

### Conventions

- **Data fetching**: every list/detail page uses `useQuery`; every write uses
  `useMutation` + `queryClient.invalidateQueries` on success + a `sonner`
  toast.
- **Form dialogs use the "key-based remount" pattern**, not a
  `reset()`-in-`useEffect`. A dialog's inner body is only mounted while
  `open` is true, keyed on the entity's id (`key={entity?.id ?? "new"}`),
  with `defaultValues` computed directly from props. This is a deliberate
  fix for a real bug class: an earlier `useEffect(() => { if (open)
  reset(...) }, [open, entity, reset])` re-fired *after* the dialog was
  already open whenever a dependency (e.g. a `Map` derived from an async
  query) recomputed — wiping fields the user had already typed.
- **Base UI `<Select>` needs an `items` prop** (a `{value: label}` map)
  whenever it has a pre-filled/default value — without it, the trigger shows
  the raw value (a UUID, an enum constant) instead of the label until the
  dropdown is opened once. Static maps live in `lib/select-items.ts`; dynamic
  ones are `useMemo`-derived from fetched data.
- **`react-hook-form`'s `watch()`** triggers a harmless React Compiler
  warning ("incompatible library") — expected and ignored throughout.

---

## Environment variables

**Backend** (`backend/.env`, see `backend/.env.example`):

`DATABASE_URL`/`DIRECT_DATABASE_URL` — two ways to fill these in, both work
unchanged with the rest of the stack:
```
# Option A — real local Postgres (this machine: Postgres 18 service, port 5432, db "posdb")
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/posdb"
DIRECT_DATABASE_URL="postgresql://postgres:<password>@localhost:5432/posdb"

# Option B — Prisma's local dev-proxy (`npx prisma dev`), no local Postgres install
DATABASE_URL=prisma+postgres://localhost:51213/?api_key=...
DIRECT_DATABASE_URL=postgres://postgres:postgres@localhost:51214/template1
```
Rest of the file is the same either way:
```
NODE_ENV=development
PORT=4000
JWT_SECRET=...            # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info             # fatal|error|warn|info|debug|trace|silent
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_HOST=...              # optional — omit and reset links just log to console instead
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...              # Gmail App Password (16 chars), NOT the account password
SMTP_FROM=...
```

**Frontend** (`frontend/.env.local`, optional — only needed to reach the
backend by something other than `localhost`):
```
NEXT_PUBLIC_API_URL=http://192.168.100.3:4000   # this machine's LAN IP; see gotcha below
```
Falls back to `http://localhost:4000` (see `lib/api-client.ts`) if unset.

---

## Key gotchas

- **Local dev DB is either a real Postgres install or `prisma dev`** — check
  `backend/.env`'s `DATABASE_URL` to tell which: a plain
  `postgresql://...@localhost:5432/...` means a real install (nothing to
  start manually, Postgres runs as a background service); a
  `prisma+postgres://localhost:51213/?api_key=...` URL means the dev-proxy,
  which **must** be running (`npx prisma dev`) before the backend can
  connect and has occasionally needed a restart after being idle
  (connection-pool staleness, not an app bug) — if any endpoint starts
  500ing with a generic "database error," restart `prisma dev`, then the
  backend. The real-Postgres option has no equivalent failure mode.
- **Prisma 7 requires the `@prisma/adapter-pg` driver adapter** for
  Postgres — the old bundled query-engine binary is gone. `prisma.config.ts`
  configures this. The generated client (`backend/src/generated/prisma`) is
  TypeScript source, not prebuilt JS — relative imports inside it need `.js`
  suffixes under NodeNext resolution; don't hand-edit it, re-run
  `prisma:generate` after any `schema.prisma` change.
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`** (`middleware()` →
  `proxy()`). `frontend/AGENTS.md` (auto-generated by `next dev` — don't
  hand-remove it from a diff, it just gets re-added; commit it anyway to keep
  the tree clean) flags that this Next version has several breaking changes from what
  most training data assumes — check `node_modules/next/dist/docs/` before
  assuming an API works the old way.
- **Express 5's `req.query` is a live getter**, re-derived from the URL on
  every access — mutating it in place after coercion (`"5"` → `5`) doesn't
  persist. Validated/coerced query values go to `req.validatedQuery` instead
  (declared in `common/types/express.d.ts`).
- **`exactOptionalPropertyTypes` is on** in `backend/tsconfig.json` (along
  with `noUncheckedIndexedAccess`, `strict`) — conditionally-included
  optional object properties need `...(cond ? { key: val } : {})` spreads
  rather than `key: cond ? val : undefined`; a value from a function call
  that might return `undefined` must be captured in a local `const` once
  (not called twice) for TypeScript to narrow it out of a ternary's true
  branch.
- **`Payment.referenceId` is deliberately not a Prisma relation** — it's a
  polymorphic pointer to either `Sale.id` or `Purchase.id` depending on
  `paymentType`. Don't try to add a `@relation` to it; join manually by type.
- **Photo upload requires the parent record to already exist** — you can't
  attach a photo while still filling out an "Add Employee"/"Add Customer"
  form; save first, then edit to add a photo (same limitation Product photo
  upload has always had).
- **Opening the app via a LAN IP (e.g. `http://192.168.x.x:3000`) instead of
  `localhost` needs two things updated together, or you get either a wall
  of 403s on every `_next` chunk, or a CORS-blocked login call**: (1)
  `allowedDevOrigins` in `frontend/next.config.ts` — Next's dev server blocks
  cross-origin requests to dev assets by default, only `localhost` is
  allowed out of the box; wildcarded to `["192.168.*.*", "10.*.*.*"]`
  (the whole private-LAN range) rather than one hardcoded IP, since this
  file is committed and different developers land on different IPs — Next
  deliberately rejects a bare `"*"` here (anti-DNS-rebinding safeguard), so
  a private-range wildcard is as broad as it gets; (2) `CORS_ORIGIN` in
  `backend/.env` must include that origin — per-developer, already
  git-ignored, no committed-file friction. Both need the dev server they
  belong to restarted — neither hot-reloads.
- **Never hardcode `NEXT_PUBLIC_API_URL` to a LAN IP** — `lib/api-client.ts`
  deliberately derives the API host from `window.location.hostname` at
  runtime instead. The `pos_token` cookie the backend sets has no `Domain`
  attribute, so it's host-only, scoped to whichever host actually answered
  the login request. If the frontend is opened via `localhost:3000` but its
  API calls are hardcoded to `192.168.x.x:4000`, the cookie gets stored
  under `192.168.x.x` — invisible to `proxy.ts`'s auth check on
  `localhost:3000` requests, so login appears to succeed (200 response, a
  toast even fires) but every subsequent navigation bounces straight back to
  `/login?next=...`. Deriving the API host from the current page's own host
  keeps them always matched, however the app is opened. Leave
  `NEXT_PUBLIC_API_URL` unset in `frontend/.env.local` unless the API
  genuinely lives on a separate host from the frontend (e.g. a real
  deployment).

## Known gaps (not built — see `PROJECT_DOCUMENTATION.md` §11 for the full log)

- **Chapter 53 — Notification APIs**: the `Notification` model/enum exist in
  the schema; nothing creates, reads, or updates a row in that table.
- **Chapter 54 — Backup APIs**: no model, no implementation.

Everything else in the original BRD/SRS/API-spec scope has a working backend
endpoint and a wired frontend page.
