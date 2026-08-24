# Mobile Shop POS — Project Documentation

A complete, from-scratch record of what was built: the database, the backend API, the
frontend application, the decisions made along the way, and the places where reality
(the DDD/API spec doc) and the schema had to be reconciled by hand.

Source requirements: `req/POS Doc.docx` (6-volume doc — BRD, SRS, DDD/Database Design,
SAD/TDD/System Architecture, UI/UX Spec, API Specification). Extracted text lives at
`req/POS_Doc_extracted.txt`.

---

## 1. What This Is

A web-based Point-of-Sale and inventory management system for a mobile phone retail
shop. It covers the full retail loop for a shop that sells phones and accessories,
buys stock from suppliers, tracks individual phones by IMEI, takes in repairs, honors
warranties, and needs its own books (expenses, cash drawer, reports).

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router), React, TypeScript |
| Frontend UI | Tailwind CSS + a shadcn-style component set built on **Base UI** (`@base-ui/react`) — not Radix |
| Frontend data | TanStack Query (React Query), react-hook-form + zod |
| Backend framework | Node.js + Express 5, TypeScript (ESM/NodeNext) |
| Database | PostgreSQL, via **Prisma ORM 7** using the `@prisma/adapter-pg` driver adapter (Prisma 7 dropped the bundled query engine binary for SQL databases) |
| Local dev database | Prisma's local Postgres dev server (`prisma dev` — a self-contained Postgres-compatible server, not a system Postgres install) |
| Auth | JWT in an httpOnly cookie (`pos_token`), verified server-side on every request |
| Image storage | Cloudinary |
| PDF/Excel export | `pdfkit` (hand-rolled table layout), `exceljs` |
| Validation | `zod` on both ends (backend request validation, frontend form validation) |
| Logging | `pino` |

## 3. Project Structure

```
pos/
├── req/                          # Requirements doc (source of truth) + extracted text
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Full DB schema (single file)
│   │   ├── migrations/           # One folder per migration, applied in order
│   │   └── seed.ts               # Permissions, roles, expense categories, admin user
│   └── src/
│       ├── server.ts             # Entry point — starts the HTTP server
│       ├── app.ts                # Express app wiring (middleware, routes, error handler)
│       ├── config/                # env.ts, prisma.ts (client singleton), cloudinary.ts
│       ├── common/
│       │   ├── constants/         # HTTP status codes, error codes, auth constants
│       │   ├── errors/AppError.ts # Typed error classes (ValidationError, NotFoundError, …)
│       │   ├── middleware/        # authenticate, authorize, validate, upload, rate limiter, error handler
│       │   ├── utils/             # code generation, pagination, JWT, password hashing, name/display helpers
│       │   └── types/              # express.d.ts (augments Request with `user`/`validatedQuery`)
│       ├── routes/index.ts        # Mounts every module's router under /api/v1
│       └── modules/                # One folder per business domain (see §7)
├── frontend/
│   ├── app/
│   │   ├── login/, forgot-password/, reset-password/   # Public auth pages
│   │   └── dashboard/              # Everything behind auth — one folder per feature
│   ├── components/
│   │   ├── ui/                     # Base UI–backed primitives (button, dialog, select, table, …)
│   │   ├── layout/                 # app-sidebar.tsx, dashboard-header.tsx
│   │   └── *.tsx                   # Shared feature components (stat-tile, confirm-dialog, export-menu, image-upload-field, …)
│   ├── lib/
│   │   ├── api-client.ts           # axios instance (withCredentials, base URL)
│   │   ├── api/                    # One file per backend module — typed fetch functions
│   │   └── select-items.ts         # Static label maps for Base UI `<Select items={...}>`
│   ├── hooks/use-current-user.ts
│   └── proxy.ts                    # Route protection (Next.js 16's renamed middleware.ts)
└── PROJECT_DOCUMENTATION.md        # This file
```

### Backend module anatomy

Every backend module follows the same five-file shape:

```
modules/<name>/
  <name>.service.ts      # Business logic + Prisma queries — the only place that touches prisma directly
  <name>.controller.ts   # Thin — pulls req.body/params/validatedQuery, calls the service, sends the response
  <name>.routes.ts        # Express Router — path + method + middleware chain (auth → permission → validate → controller)
  <name>.validation.ts    # zod schemas for params/query/body
  index.ts                 # Re-exports the router (routes/index.ts only ever imports from here)
```

---

## 4. Architecture

**Request flow (backend):** `app.ts` → global middleware (helmet, cors, cookie-parser,
rate limiter, morgan/pino logging) → `apiRouter` (`routes/index.ts`) → module router →
`authenticate` (verifies the JWT cookie, attaches `req.user`) → `requirePermission(...)`
(checks `req.user.permissions`) → `validate({ params, query, body })` (zod, 422 on
failure) → controller → service (Prisma) → `sendSuccess`/`sendPaginated` → JSON
envelope `{ success, message, data, pagination? }`. Every thrown error is an `AppError`
subclass caught by a single `errorHandler` middleware and turned into the same
envelope shape with `{ success: false, message, code }`.

**Request flow (frontend):** Server-rendered shell (`app/dashboard/layout.tsx`, not
listed above but present) renders `AppSidebar` + `DashboardHeader` + page content.
Every page is a client component using TanStack Query for data (`useQuery`/
`useMutation`), talking to the backend through `lib/api-client.ts` (axios,
`withCredentials: true` so the httpOnly auth cookie rides along automatically) and one
typed function per endpoint in `lib/api/*.ts`. `proxy.ts` (Next 16's renamed
`middleware.ts`) redirects unauthenticated requests to `/login` and redirects an
already-logged-in session away from public auth pages.

**Multi-step writes are transactional.** Every operation that touches more than one
table in a way that must succeed or fail together (Create Sale, Create Purchase,
Cancel Sale, Sales/Purchase Returns, Stock Adjustment, Cash Drawer open/close) is
wrapped in `prisma.$transaction()`.

**RBAC, not hardcoded roles.** Authorization is permission-code-based
(`requirePermission("SALE_CREATE")`), not role-name-based. Roles are just named
bundles of permissions, resolved fresh from the database on every request — no
caching, so a permission change takes effect immediately without requiring the
affected user to log out and back in.

---

## 5. Database Design

One schema file (`backend/prisma/schema.prisma`), organized into the same domains the
DDD volume uses. UUID primary keys everywhere; `snake_case` Postgres columns mapped
from `camelCase` Prisma fields via `@map`.

### 5.0 Multi-tenancy

Converted from a single-shop schema into a multi-tenant SaaS platform: **one shared
Postgres database**, no per-shop database or schema — every business table carries a
`shopId` column instead. This is not in the original DDD (which only ever modeled one
shop); it's the foundation increment for a Platform Admin layer, subscriptions, and
public shop registration (in progress — see §11 for what's built so far).

- **`Shop`** is the tenant root. `Shop.ownerId` points at the `User` who owns it;
  that same user's own `User.shopId` points back at the shop (two separate FK
  columns, both set together — see `Shop`'s comment in `schema.prisma`).
- **`User.shopId` is nullable**: `NULL` means a **Platform Admin** (operates above
  every shop, via a separate `PLATFORM_*` permission set — see §6); non-`NULL` means
  an ordinary shop user (Owner/Manager/Cashier/etc., scoped to exactly one shop).
  `User.username`/`User.email` stay **globally** unique across the whole platform —
  not shop-scoped — so there's one login namespace for everyone.
- **`Role.shopId` is nullable too**: every shop gets its **own editable copy** of the
  seeded roles (`@@unique([shopId, roleName])`), not a shared global set — matching
  this app's existing "roles are fully editable at runtime" behavior, just per shop
  now. `NULL` is reserved for the single seeded "Platform Admin" role.
  `Permission` itself stays one global, unscoped catalog (fixed constants); the
  `module` column just distinguishes `"Platform"` permissions from shop-module ones.
- **Direct `shopId` column** on every header/list-level tenant table — see the domain
  table below for the full list. **Derived via parent only** (no column) for
  `ProductImage`, `PurchaseItem`, `SaleItem`, `RepairItem` — always reached through an
  already shop-scoped parent id, so a duplicate column would be pure redundancy.
- **Tenant isolation is enforced explicitly in every service function**, not via a
  Prisma middleware/extension: `common/middleware/tenant.ts`'s `getShopId(req)` is the
  one place every controller pulls the caller's shop id from (never from a
  client-supplied body/query/param value), threaded as the first argument into the
  matching service function, which adds it to every `where`/`data`. Any lookup of a
  single record by a client-supplied id uses `findFirst({ where: { id, shopId } })`,
  never `findUnique({ where: { id } })` — a valid UUID belonging to another shop 404s
  exactly like a nonexistent one, so cross-tenant existence is never leaked.
- **Deliberately still globally unique** (not shop-scoped) despite living on a tenant
  table: `ImeiNumber.imeiNumber` — a real IMEI is a globally unique hardware
  identifier by GSMA standard, so shop-scoping that constraint would be factually
  wrong. Every other former single-column unique on a tenant table (SKU, invoice
  number, customer/employee/supplier code, role name, setting key, expense
  number, …) became a `@@unique([shopId, <field>])` composite — which also
  implements per-shop invoice/purchase/repair numbering "for free."
- **Migrating an already-populated database** (e.g. real production data) to this
  shape is a 3-step, zero-data-loss sequence — see `backend/prisma/backfill-default-shop.ts`'s
  header comment for the exact order (additive nullable-`shopId` migration → run the
  backfill script → additive-turned-required NOT NULL migration). A fresh dev
  database instead just runs `prisma/seed.ts`, which is shop-aware and creates its
  own "Default Shop" if none exists.
- **Not yet built** (tracked in §11): Platform Admin CRUD endpoints/UI, public shop
  registration, trial/subscription enforcement (`requireOperationalAccess`
  middleware), and the admin dashboard/reports. `Shop`, `SubscriptionPlan`,
  `Subscription`, and `SubscriptionHistory` exist in the schema now so this can land
  without another disruptive migration, but nothing writes to `Subscription`/
  `SubscriptionHistory` yet outside the seed/backfill scripts' one-off "Legacy
  Access" row.

### 5.1 Domain groups

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
| Payments | `Payment` |
| Cash Drawer | `CashDrawer`, `CashDrawerTransaction` |
| Repairs | `Repair`, `RepairItem` |
| Warranty | `Warranty` |
| Expenses | `ExpenseCategory`, `Expense` |
| System | `Notification`, `AuditLog`, `Setting` |

### 5.2 Enums

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

### 5.3 Key relationships worth knowing

- **`Payment.referenceId` is a polymorphic pointer**, not a foreign key. Depending on
  `paymentType` it points at either a `Sale.id` or a `Purchase.id`. Deliberately not a
  Prisma relation since it targets two different tables.
- **`Sale` ↔ `ImeiNumber` ↔ `Warranty`**: selling an IMEI-tracked product flips that
  IMEI's status to `SOLD`, links it to the sale, and — if the product has
  `warrantyMonths` set and the sale has a customer — creates a `Warranty` row with
  `startDate`/`expiryDate` computed from the sale date.
- **`Product.tracksImei`** decides whether a product is sold/bought by individual
  IMEI (phones) or by plain quantity (accessories). Drives IMEI-required validation
  throughout Purchases and Sales.
- **`Inventory` is one row per product** (`quantity`, `availableQuantity`,
  `reservedQuantity`, `reorderLevel`), with every quantity change also writing an
  `InventoryTransaction` audit row (type + signed quantity + reference number).
- **`CashDrawer`/`CashDrawerTransaction`** track per-cashier register sessions.
  `CASH`-method sale payments and sale-cancellation/return refunds auto-log a
  transaction against the cashier's currently open drawer (best-effort — a missing
  open session never blocks the sale itself, since only cash payments touch the
  physical drawer).

### 5.4 Deliberate deviations from the DDD

The 6-volume doc's Database Design Document doesn't always give the schema enough
structure to satisfy what the Functional Requirements or the API Specification
volume actually asks for. Every place this happened is marked in the schema itself
with a `// Not in DDD Table N — ...` comment explaining why. The full list:

| Addition | Table | Why |
|---|---|---|
| `PasswordResetToken` (whole model) | — | The DDD has no forgot/reset-password table at all; the API Spec's Forgot/Reset Password endpoints need one. |
| `Product.tracksImei` | Products | SRS 17.2 requires phones to be IMEI-tracked and accessories to be quantity-tracked, but the DDD gives no column to tell them apart. |
| `ProductModel.isActive` | Product Models | SRS Module 5 ("models can be activated/deactivated") and the API Spec's status filter both need it. |
| `Sale.isCancelled` / `cancelledAt` / `cancelReason` | Sales | The API Spec's Cancel Sale endpoint (34.4) needs a cancelled state distinct from payment status, which DDD Table 21 has no field for. |
| `PurchaseReturnItem` (whole model) | Purchase Returns | DDD Table 20 is a single row with one aggregate `return_amount` — but the API Spec's Create Purchase Return body sends a per-product `items` array, and reversing inventory correctly requires knowing exactly which product/quantity came back. |
| `SalesReturnItem` (whole model) | Sales Returns | Same reasoning, mirrored for the customer-facing side (DDD Table 23 → API Spec 35.2's `items` array). |
| `Customer.attachmentUrl` | Customers | API Spec Chapter 52 lists "Customer Attachment" as an upload type; DDD Table 16 has nowhere to put the resulting URL. |
| `Employee.profileImage` | Employees | Same chapter's "Employee Photo" upload type; User already had `profileImage`, but an employee doesn't necessarily have a login. |
| `Repair.imageUrl` | Repairs | Same chapter's "Repair Image" upload type (device condition at intake). |

Every one of these was added only once the corresponding feature was actually being
built, not speculatively up front.

---

## 6. Authentication & Authorization

- **Login**: `POST /api/v1/auth/login` verifies username/password (bcrypt), issues a
  JWT, and sets it as an httpOnly `pos_token` cookie (not returned in the JSON body
  for the frontend to store itself — the cookie is the only place it lives).
- **Every request** re-verifies the JWT and re-resolves the user's roles →
  permissions fresh from the database — no permission caching, so role/permission
  edits apply immediately. The re-fetch also re-reads `shopId` fresh every time
  (never trusted from the JWT payload alone), same reasoning: a shop reassignment
  applies immediately, not just after the token expires.
- **Multi-tenancy**: `req.user.shopId` (`null` for a Platform Admin) is what every
  tenant-scoped route's authorization is actually built on — see §5.0.
- **RBAC**: permissions are granular codes (`SALE_CREATE`, `PRODUCT_MANAGE`, …), not
  role names. `requirePermission("A", "B")` grants access if the user holds *any* of
  the listed codes. Roles are just named, editable bundles of permissions (Users →
  Roles → Permissions is fully manageable from the UI, not fixed at seed time).
- **Password reset**: anti-enumeration by design — `forgot-password` always returns
  the same generic success message whether or not the email exists.

### 6.1 Seeded permission codes

| Code | Module | Description |
|---|---|---|
| `USER_VIEW` / `USER_MANAGE` | Users | View / create-update-deactivate system users |
| `ROLE_MANAGE` | Roles | Manage roles and permission assignments |
| `PRODUCT_VIEW` / `PRODUCT_MANAGE` | Products | View / create-update-delete products |
| `INVENTORY_VIEW` / `INVENTORY_MANAGE` | Inventory | View stock / adjust stock |
| `SALE_VIEW` / `SALE_CREATE` / `SALE_CANCEL` | Sales | View / create / cancel-or-return sales |
| `PURCHASE_VIEW` / `PURCHASE_CREATE` / `PURCHASE_RETURN` | Purchases | View / record / return purchases |
| `PAYMENT_VIEW` / `PAYMENT_MANAGE` | Payments | View / record payments |
| `CASH_DRAWER_VIEW` / `CASH_DRAWER_MANAGE` | Cash Drawer | View sessions / open-close-cash in-out |
| `CUSTOMER_VIEW` / `CUSTOMER_MANAGE` | Customers | View / create-update customers |
| `SUPPLIER_VIEW` / `SUPPLIER_MANAGE` | Suppliers | View / create-update suppliers |
| `REPAIR_VIEW` / `REPAIR_MANAGE` | Repairs | View / create-update repair tickets |
| `WARRANTY_VIEW` / `WARRANTY_MANAGE` | Warranties | View / claim warranties |
| `EXPENSE_VIEW` / `EXPENSE_MANAGE` | Expenses | View / record expenses |
| `EMPLOYEE_VIEW` / `EMPLOYEE_MANAGE` | Employees | View / create-update employees |
| `REPORT_VIEW` / `REPORT_EXPORT` | Reports | View reports / export to PDF-Excel-CSV |
| `SETTINGS_VIEW` / `SETTINGS_MANAGE` | Settings | View / change system settings |
| `AUDIT_VIEW` | Audit | View audit logs |

### 6.2 Default roles (seeded)

| Role | Gets |
|---|---|
| **Owner** | Every permission (full access) |
| **Manager** | Products, Inventory (view), Sales, Purchases (+return), Payments, Cash Drawer, Customers, Suppliers, Reports (view) |
| **Cashier** | Sales (+cancel), Payments (manage), Cash Drawer, Customers, Products (view), Inventory (view) |
| **Inventory Staff** | Products, Inventory, Purchases (+return), Payments (manage), Suppliers |
| **Technician** | Repairs, Warranties |
| **Accountant** | Expenses, Payments (view), Reports (view + export) |

Roles/permissions are fully editable at runtime from Users → Roles in the UI; this
table is just the seed starting point.

---

## 7. Backend Modules & API Reference

All endpoints are mounted under `/api/v1`. Every route requires authentication
(`authenticate` middleware) unless noted; most also require a specific permission.

### Auth — `/api/v1/auth`
| Method | Path | Notes |
|---|---|---|
| POST | `/login` | Rate-limited. Sets the `pos_token` cookie. |
| POST | `/logout` | Clears the cookie. |
| GET | `/me` | Current user + resolved permissions. |
| PATCH | `/change-password` | Requires current password. |
| POST | `/forgot-password` | Public. Anti-enumeration (always generic success). |
| POST | `/reset-password` | Public, rate-limited. Consumes a `PasswordResetToken`. |

### Registration — `/api/v1/registration` (multi-tenancy)
| Method | Path | Notes |
|---|---|---|
| POST | `/shop` | Public, rate-limited (same limiter as `/auth/login`). One transaction: creates `Shop` (`status: TRIAL`) + Owner `Employee`/`User` + that shop's own copy of the 6 default roles + a 30-day `Subscription`/`SubscriptionHistory` + a platform-level `AuditLog` row, then sets the `pos_token` cookie — registration doubles as auto-login. Reuses `common/utils/authCookie.ts#setAuthCookie` (also used by `/auth/login`) and `common/constants/defaultRoles.ts` (also used by `prisma/seed.ts`). |

### Subscription — `/api/v1/subscription` (multi-tenancy)
| Method | Path | Notes |
|---|---|---|
| GET | `/` | Authenticated, shop-scoped. Current plan/status/trial dates + a live-computed `daysRemaining`/`isExpired` (never trusts a cached value). |
| GET | `/plans` | Active, non-trial plans the shop can switch to. |
| POST | `/select-plan` | `{ planId }`. Switches the shop onto it immediately (`status: ACTIVE`, `endDate` = now + plan duration) — no payment gateway exists, so this *is* the "manually managed" subscription-status support spec §40 explicitly allows, not faked billing; `paymentStatus` is `PENDING` for a priced plan, `NOT_REQUIRED` for a free one. Writes a `SubscriptionHistory` row. |

### Admin Subscription Plans — `/api/v1/admin/subscription-plans` (multi-tenancy, Platform Admin only)
`PLATFORM_PLAN_VIEW`/`PLATFORM_PLAN_MANAGE`. Platform-level reference data (not
shop-scoped). `GET /`, `POST /` (create — commercial fields: name, description,
price, currency, billing interval, duration, plus `maxUsers`/`maxProducts`,
each `number | null` with `null` meaning unlimited), `PATCH /:id` (edit,
including `isActive` and the two limit fields). No delete — same
soft-delete-only convention as Brand/Category. The schema's other seven
plan-limit fields (`maxMonthlySales`, `maxBranches`, `maxStorageMb`,
`advancedReports`, `imeiTracking`, `repairsEnabled`, `warrantyEnabled`,
`multiBranch`) still keep their defaults with no admin UI or enforcement —
see §11.9.

**Plan-limit enforcement** (`common/services/planLimits.ts#checkPlanLimit`):
called as the first line of `createUser`/`createProduct` — loads the shop's
current subscription's plan, and if `maxUsers`/`maxProducts` is non-null,
counts the shop's current active users/products
(`prisma.user.count({where:{shopId, isActive:true}})` / same for `Product`)
and throws `PlanLimitExceededError` (403, `ErrorCode.PLAN_LIMIT_EXCEEDED`) if
the count has already reached the limit. A `null` limit (the seeded default)
never blocks. Only guards creation — editing or deactivating an existing
user/product is never blocked, even once a shop is already over a
newly-lowered limit.

### Admin Shops — `/api/v1/admin/shops` (multi-tenancy, Platform Admin only)
Gated by `requirePlatformContext` (rejects any caller whose token resolves to a real
shop) + `PLATFORM_SHOP_*`/`PLATFORM_TRIAL_EXTEND` permissions.

| Method | Path | Notes |
|---|---|---|
| GET | `/` , `/:id` | Paginated list (search by shop/owner name, filter by status) / detail (shop + owner + current subscription). |
| POST | `/` | Same `common/services/provisionShop.ts` transaction registration uses — admin-created shops always get the 1-month free trial. |
| PATCH | `/:id` | Edit shop info. |
| PATCH | `/:id/suspend` , `/:id/activate` | Flips `Shop.status` and the current `Subscription.status` together; activating a still-within-term subscription restores `TRIAL`, otherwise falls back to `ACTIVE`. |
| POST | `/:id/extend-trial` | `{ days, reason }`, reason required. Extends from the current end date if still active, from *now* if already expired (never an already-expired extension) — writes a `SubscriptionHistory` row and an `AuditLog` entry with the before/after end date. |
| PATCH | `/:id/archive` | `PLATFORM_SHOP_DELETE`. A permanent close, not a hard delete — sets `Shop.status`/current `Subscription.status` to `CANCELLED` (same soft-delete-only convention as Product/Employee/User). One-way: `activate`/`suspend` both reject an already-`CANCELLED` shop. |

### Admin Dashboard — `/api/v1/admin/dashboard` (multi-tenancy, Platform Admin only)
| Method | Path | Notes |
|---|---|---|
| GET | `/summary` | `PLATFORM_DASHBOARD_VIEW`. Shop status-bucket counts (Total/Active/Trial/Expiring-within-7-days/Expired/Suspended — computed from `Shop.status`, the one-row-per-shop cached column, **not** raw `Subscription` rows, which accumulate one per plan change and would double-count a shop that's switched plans), total platform users (excludes Platform Admin accounts), new-subscriptions-this-month revenue (labeled precisely — no billing-cycle automation exists, so this isn't collected/recurring revenue), and the 5 most recently created shops. No charts yet (see §11.9). |

### Admin Reports — `/api/v1/admin/reports` (multi-tenancy, Platform Admin only)
`PLATFORM_REPORT_VIEW`. View-only — no PDF/Excel/CSV export yet (deliberate scope
cut, see §11.9), unlike the shop-level `reports`/`export` apparatus.

| Method | Path | Notes |
|---|---|---|
| GET | `/shops-performance` | Every shop's lifetime sales/purchase totals + current plan name, joined in Node from separate `groupBy` aggregates (small result set, same acceptable pattern as the platform dashboard's own recent-shops join). |
| GET | `/subscription-overview` | Per-plan breakdown: shops *currently* on each plan (via the same `distinct: ["shopId"]` "newest subscription row" pattern the platform dashboard uses, for the same double-counting reason) and lifetime revenue per plan (a plain sum across all `Subscription` rows for that plan — revenue is additive across a shop's whole history, so no `distinct` needed there). |

### Operational access enforcement (multi-tenancy)
`common/middleware/operationalAccess.ts#requireOperationalAccess` sits on the write
routes of Sales, Purchases, Sales/Purchase Returns, Inventory adjustments, Expenses,
Repairs, and Cash Drawer open/cash-in/cash-out (not `/close`, so a mid-expiry shop can
still close out its drawer) — throws a 403 (`TRIAL_EXPIRED`/`SHOP_EXPIRED`/
`SHOP_SUSPENDED`/`SUBSCRIPTION_REQUIRED`) if the shop's current subscription is
expired/suspended/cancelled/missing, computed live from `Subscription.endDate` (same
"never trust the cache" principle as `Shop.status`). Read routes, `/auth/*`,
`/subscription`, and `/settings` are deliberately never gated by it. A newly-detected
expiry also self-heals the cached `Shop`/`Subscription` status columns, best-effort.

### Users — `/api/v1/users`
Full CRUD; `DELETE` is a soft-delete (deactivate). Creating/editing a user's name
transparently provisions/updates the linked `Employee` record (Users has no `name`
column of its own — display names live on `Employee`).

### Roles & Permissions — `/api/v1/roles`, `/api/v1/permissions`
`GET/POST/PATCH/DELETE /roles`, `POST /roles/:id/permissions` (replaces the full
permission set for a role). `GET /permissions` — read-only catalog for the
permission-picker UI.

### Product Catalog — `/api/v1/brands`, `/categories`, `/models`, `/products`
Standard CRUD per resource. `POST /products/:id/image` uploads a product photo to
Cloudinary and creates a `ProductImage` row (first upload becomes `isPrimary`).

### Inventory — `/api/v1/inventory`
`GET /` (filterable by product/category/brand/stock-status — status is computed
in-memory since it compares two columns), `GET /:productId/history` (transaction
log), `POST /adjustment` (manual increase/decrease with a required reason — fully
transactional: updates `Inventory`, writes a `StockAdjustment`, writes an
`InventoryTransaction`).

### Customers & Suppliers — `/api/v1/customers`, `/api/v1/suppliers`
CRUD + `GET /:id/history` (purchase/sales history per entity).

### Purchases — `/api/v1/purchases`
`POST /` validates supplier + IMEI requirements, then in one transaction: creates the
purchase, creates purchase items, increases inventory, registers IMEIs, records the
initial payment. `DELETE /:id` reverses stock and removes IMEIs — refuses if any of
that stock has already moved (sold IMEIs) or reversal would take stock negative.

### Sales (POS) — `/api/v1/sales`
`POST /` follows the doc's flow exactly: validate stock → validate IMEI → create
invoice → decrease stock → update IMEI status → create warranty (if applicable) →
receive payment — one transaction. `PATCH /:id/cancel` reverses all of it (restores
inventory, frees IMEIs, cancels warranties, records a refund) without deleting
anything — full audit trail preserved.

### Cash Drawer — `/api/v1/cash-drawer`
`POST /open` (opening balance), `POST /close` (computes `expectedBalance` from
actual transaction history, reports the counting `difference`), `POST /cash-in`,
`POST /cash-out`, `GET /current` (caller's open session), `GET /summary` (Opening
Cash / Sales Cash / Cash In / Refunds / Expenses / Cash Out / Expected Closing —
matches API Spec 37.3 exactly), `GET /` (session history, for managers).

### Sales Returns & Purchase Returns — `/api/v1/sales-returns`, `/api/v1/purchase-returns`
`POST /` on either: over-return protection (can't return more than was sold/bought
minus what's already been returned), releases/removes IMEIs appropriately, and
auto-creates a REFUND payment (sales side) or adjusts the supplier's outstanding
balance (purchase side).

### Payments — `/api/v1/payments`
`POST /` records an additional payment against an existing sale or purchase (beyond
what was taken at creation time). `GET /history/:id` — payment history + remaining
balance for a given sale/purchase.

### Repairs — `/api/v1/repairs`
`POST /` (device + IMEI accepted as free text — only linked structurally when they
match records this shop actually has; `technicianId` optional), `PATCH /:id/status`
(auto-stamps `deliveredDate` on DELIVERED; locked once DELIVERED/CANCELLED), `PATCH
/:id` (diagnosis/cost/technician/remarks), `POST /:id/items` ("Record Parts Used" —
decrements real inventory), `GET /`, `GET /:id`.

### Warranties — `/api/v1/warranties`
`GET /` (filterable by customer/product/status/expiring-within-days). `POST /claim`
rejects expired/already-claimed warranties and — beyond the doc's literal spec —
automatically opens a linked `Repair` ticket (RECEIVED, no charge), since a warranty
claim is, in practice, always the start of a repair job.

### Employees — `/api/v1/employees`
CRUD; `DELETE` deactivates (SRS: "employee records shall remain available even if
inactive").

### Expenses — `/api/v1/expenses`
`GET /categories` (the doc's fixed 9-category list, seeded; unknown categories
auto-create on the fly). Full CRUD on expenses; `DELETE` is a real delete (no
dependent records, unlike Users/Employees/Customers).

### Reports — `/api/v1/reports` (all read-only, `REPORT_VIEW`/`REPORT_EXPORT`)
17 endpoints across six areas:
- **Sales**: `/sales/summary`, `/sales/daily`, `/sales/products`, `/sales/employees`
- **Purchases**: `/purchases/summary`, `/purchases/suppliers`
- **Inventory**: `/inventory/stock`, `/inventory/low-stock`, `/inventory/movement`, `/inventory/imei`
- **Financial**: `/financial/profit-loss`, `/financial/expenses`, `/financial/cash-flow`
- **Customers**: `/customers/purchases`, `/customers/balance`
- **Suppliers**: `/suppliers/balance`, `/suppliers/payments`

Two known simplifications, both because the schema doesn't snapshot a per-sale unit
cost: "profit" (Product Sales Report, Profit & Loss) uses each product's *current*
`purchasePrice` as a cost proxy, not true historical COGS; "cash vs. credit sales"
(Daily Sales Report) is inferred from `dueAmount` (paid-in-full vs. still-owing), not
an explicit payment-method split.

### Export — `/api/v1/export`
`POST /report` — `{ reportType, format, filters }`. `reportType` is any of the 17
report paths above; `format` is `pdf` | `excel` | `csv`. Summary-shaped reports
(Sales Summary, Profit & Loss, Cash Flow, Purchase Summary) auto-transpose into a
"Metric / Value" table instead of one absurdly wide row. PDF has no library table
support in `pdfkit`, so it's a small hand-rolled layout (fixed column widths, bold
header row, auto page-break).

### Uploads — `/api/v1/uploads`
`POST /image` — one generic endpoint for all five upload types the doc lists
(`product`, `employee`, `customer`, `repair`, `logo`), each gated by its own
`*_MANAGE` permission (checked in the controller, since `requirePermission` can't
express "the permission depends on `req.body.type`"). `DELETE /image/:id` removes
both the Cloudinary asset and the database reference — `id` is either a real
`ProductImage` UUID or a composite `type:entityId` string (e.g. `employee:<uuid>`,
`logo:shop`) the upload response itself returns.

### Dashboard — `/api/v1/dashboard/summary`
The landing-page aggregate: today's/monthly sales, today's purchases, total revenue,
total expenses, net profit (revenue − expenses), product/customer/supplier counts,
low-stock/out-of-stock counts, pending payments, pending repairs, 5 most recent
sales and purchases. No specific permission gate — every role lands here after login.

---

## 8. Frontend

### 8.1 Pages (App Router)

**Public**: `/login`, `/register`, `/forgot-password`, `/reset-password`

**Platform Admin** (`shopId: null`, own layout/sidebar per spec §56 — never mixed
with the shop sidebar; a shop user hitting these gets redirected to `/dashboard`,
and vice versa — `components/tenant-redirect-guard.tsx`):

| Route | Purpose |
|---|---|
| `/admin` | Platform dashboard — stat tiles + recent shops. |
| `/admin/shops` | List + search/filter by status. |
| `/admin/shops/new` | Create-shop form — always grants a free trial. |
| `/admin/subscription-plans` | Plan list + create/edit dialog. |
| `/admin/reports` | Shop Performance + Subscription Overview tables (view-only). |
| `/admin/shops/[id]` | Detail + Suspend/Activate + Extend Trial dialog. |

**Authenticated** (all under `/dashboard`):

| Route | Purpose |
|---|---|
| `/dashboard` | Real-data landing page — stat tiles + recent sales/purchases |
| `/dashboard/pos` | Point-of-sale screen (product search, cart, checkout) |
| `/dashboard/subscription` | Trial/plan status (multi-tenancy — `TrialStatus` component) |
| `/dashboard/sales`, `/sales/[id]` | Sales list + detail (payment recording, cancel, return) |
| `/dashboard/purchases`, `/purchases/new`, `/purchases/[id]` | Purchase list, create, detail (return) |
| `/dashboard/cash-drawer` | Open/close, cash in/out, live session summary |
| `/dashboard/expenses` | Expense CRUD |
| `/dashboard/customers`, `/suppliers` | CRUD list + dialog |
| `/dashboard/repairs`, `/repairs/[id]` | Ticket list/create + detail (status, parts, photo) |
| `/dashboard/warranties` | List + one-click claim (opens a linked repair) |
| `/dashboard/reports` | Category-switchable report viewer + per-report export |
| `/dashboard/products`, `/inventory`, `/brands`, `/categories`, `/models` | Catalog management |
| `/dashboard/users`, `/roles`, `/employees` | Admin |

### 8.2 Conventions

- **Data fetching**: every list/detail page uses `useQuery`; every write uses
  `useMutation` + `queryClient.invalidateQueries` on success + a `sonner` toast.
- **Form dialogs use the "key-based remount" pattern**, not a `reset()`-in-`useEffect`.
  A dialog's inner body is only mounted while `open` is true, keyed on the entity's
  id (`key={entity?.id ?? "new"}`), with `defaultValues` computed directly from props.
  This was a deliberate fix after a real bug: an earlier version used
  `useEffect(() => { if (open) reset(...) }, [open, entity, reset])`, and when one of
  the effect's dependencies was a `Map` recomputed from an async query, the effect
  re-fired *after* the dialog was already open — wiping out fields the user had
  already typed. Remounting instead of resetting eliminates that whole class of bug.
- **Base UI `<Select>` needs an `items` prop** (a `{value: label}` map) whenever it
  has a pre-filled or default value — without it, the trigger shows the raw value
  (a UUID, an enum constant) instead of the label until the dropdown is opened once.
  Static maps live in `lib/select-items.ts`; dynamic ones are `useMemo`-derived from
  fetched data.
- **`react-hook-form`'s `watch()` triggers a harmless React Compiler warning**
  ("incompatible library") — expected and ignored throughout.
- **Stat tiles** (`components/stat-tile.tsx`) carry status via a text-token color +
  icon, never color alone (warning/critical tones), per the project's dataviz
  guidance.

### 8.3 Shared components worth knowing

- `image-upload-field.tsx` — thumbnail + Upload/Replace/Remove, used identically for
  Employee photos, Customer attachments, and Repair photos. Backed by a *live*
  per-entity query (not the possibly-stale prop the parent list passed in), so a
  fresh upload shows immediately without closing and reopening the dialog.
- `export-menu.tsx` — a small PDF/Excel/CSV dropdown reused on every report card.
- `confirm-dialog.tsx` — shared yes/no confirmation for every delete action.

---

## 9. Key Technical Decisions & Gotchas

- **Prisma 7 requires a driver adapter** (`@prisma/adapter-pg`) for Postgres — the
  old bundled query-engine binary is gone. `prisma.config.ts` configures this; the
  generated client is TypeScript source (not pre-built JS), so relative imports
  inside it need `.js` suffixes under NodeNext module resolution.
- **The local dev database is `prisma dev`**, not a system Postgres install. It must
  be running (`npx prisma dev` in its own terminal) before the backend can connect —
  `DATABASE_URL` points at its proxy port. This local server has occasionally needed
  a restart after being idle (a connection-pool staleness issue, not an application
  bug) — if `dashboard/summary` or any endpoint starts 500ing with a generic
  "database error", restart `prisma dev` and then the backend.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (function `middleware()` →
  `proxy()`). This project's own `AGENTS.md` flags that Next 16 has several
  breaking changes from what most training data assumes.
- **Express 5's `req.query` is a live getter** re-derived from the URL on every
  access — mutating it in place after coercion (e.g. turning `"5"` into `5`) doesn't
  persist. Validated/coerced query values are written to `req.validatedQuery`
  instead (declared in `common/types/express.d.ts`).
- **`exactOptionalPropertyTypes` is on** in `tsconfig.json` — conditionally-included
  optional object properties need `...(cond ? { key: val } : {})` spreads rather than
  `key: cond ? val : undefined`, and a value computed via a function call that might
  return `undefined` must be captured in a local `const` once (not called twice)
  or TypeScript can't narrow it out of a ternary's true branch.

---

## 10. Environment & Running Locally

Two ways to provide the Postgres database `DATABASE_URL`/`DIRECT_DATABASE_URL` point at —
either works unchanged with the rest of the stack, since Prisma just sees a connection string
either way.

### Option A — a real local PostgreSQL install (this machine's setup)

A standard PostgreSQL server (e.g. installed via the official Windows installer, which also
bundles pgAdmin) running as a normal service on port 5432, with a dedicated database
(`posdb`) created ahead of time. `DATABASE_URL` and `DIRECT_DATABASE_URL` are the *same*
value here — there's no dev-proxy involved, just a normal TCP connection:

```
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/posdb"
DIRECT_DATABASE_URL="postgresql://postgres:<password>@localhost:5432/posdb"
```

```bash
cd backend
npm run prisma:migrate   # applies all migrations to posdb (run once, and again after any new migration)
npm run prisma:seed      # permissions, roles, expense categories, admin user
npm run dev               # http://localhost:4000 — no separate DB terminal needed, Postgres runs as a background service
```

### Option B — Prisma's local dev-proxy (`prisma dev`)

No local Postgres install required — Prisma spins up its own self-contained
Postgres-compatible server on demand.

```
DATABASE_URL=prisma+postgres://localhost:51213/?api_key=...   # from `prisma dev`
DIRECT_DATABASE_URL=postgres://postgres:postgres@localhost:51214/template1
```

```bash
# Terminal 1 — local Postgres-compatible dev server (keep running)
cd backend
npx prisma dev

# Terminal 2 — backend API (auto-restarts on file changes)
cd backend
npm run dev              # http://localhost:4000
npm run prisma:migrate   # apply schema changes
npm run prisma:seed      # permissions, roles, expense categories, admin user
```

### Both options

```
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Seeded admin login: `admin` / `Abc@1234` (seed script prints a warning to change
it immediately).

**Frontend**:
```bash
cd frontend
npm run dev               # http://localhost:3000
```

---

## 11. What's Not Built / Known Gaps

An earlier pass through this section (verified directly against the code, not
recalled from memory) found nine real gaps, listed below with what was actually
done to close each one. Two items remain genuinely out of scope — they're called
out at the end rather than glossed over.

### 11.1 Closed — email delivery

**Was:** Forgot-password was fully functional end-to-end (token generation,
expiry, anti-enumeration response, consumption on reset) but no email provider was
wired up — the reset link only ever reached the server's log output.

**Now:** `backend/src/config/mailer.ts` wraps `nodemailer` behind an
`isEmailConfigured` gate (same "degrade gracefully if unset" pattern as
Cloudinary). `auth.service.ts`'s `forgotPassword` sends a real email via Gmail
SMTP when `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are set in `.env`, and still falls
back to a logged link if they aren't. `SMTP_PASS` must be a Gmail **App
Password** (not the account password) supplied by whoever owns the sending
account.

### 11.2 Closed — pagination

**Was:** Every list page fetched a single hardcoded-limit page and rendered
exactly that, even though every backend list endpoint already returned full
`{page, limit, total, totalPages}` metadata.

**Now:** One shared `<PaginationControls>` component ("Showing X–Y of Z" +
Prev/Next) is wired into all ~15 list pages (Sales, Purchases, Products,
Inventory, Customers, Suppliers, Employees, Expenses, Repairs, Warranties, Users,
Brands, Categories, Models, plus a new Cash Drawer history section). `Roles`
deliberately stays unpaginated — its backend `listRoles()` returns a flat array
by design, there are never enough roles to need it.

### 11.3 Closed — client-side RBAC UI

**Was:** The sidebar rendered every nav item to every logged-in user regardless
of role. The backend correctly rejected unauthorized requests with a 403 either
way, but a Cashier saw "Users," "Roles," "Reports," and every other admin link
they had no access to, and clicking one meant a raw error or a stuck loading
state.

**Now:** `AppSidebar` filters each nav item against the current user's
`permissions[]` (arrays copied 1:1 from each route's own
`requirePermission(...)` call, so the UI can never show something the API would
reject). A `<RequirePermission>` component plus one `layout.tsx` guard per
protected route segment (18 of them — Next.js nested layouts cover dynamic
sub-routes like `sales/[id]` for free) shows a clean "Access denied" card instead
of a broken page for anyone who navigates to a URL directly. This is a UX layer
only — `requirePermission` on the backend remains the actual security boundary.

### 11.4 Closed — Settings module

**Was:** No `settings.service.ts`/routes/page existed. The `Setting` key-value
table was technically usable (Uploads already upserted a `shop_logo` row) but
nothing ever read or displayed it, and the sidebar's shop name/icon were
hardcoded.

**Now:** A full `settings` module — `GET /settings` (no permission gate; shop
branding is read by every role's sidebar) and `PATCH /settings` (gated by
`SETTINGS_MANAGE`) against a `KNOWN_KEYS` allowlist (`shop_name`,
`shop_address`, `shop_phone`, `shop_email`, `shop_logo`, `currency`,
`timezone`) with sensible defaults. A new Settings page lets an Owner/Admin edit
all of it, including the logo via the same `ImageUploadField` used elsewhere
(`entityId` made optional to support this logo-as-singleton case). The sidebar
header and every printable document now source the shop name/logo from here
instead of a hardcoded value.

### 11.5 Closed — print views

**Was:** No printable invoice or repair receipt existed — a completed sale
opened the same admin-style detail page used to manage it, and a browser's
native print button printed the full app chrome, sidebar included.

**Now:** Two standalone routes outside `/dashboard` — `/print/sales/[id]` and
`/print/repairs/[id]` — render a clean, chrome-free invoice/receipt (shop
header pulled from Settings, itemized table, totals, a `print:hidden` Print
button). "Print Invoice" / "Print Receipt" buttons on the Sale and Repair detail
pages open them in a new tab.

### 11.6 Closed — purchase edit UI

**Was:** `PATCH /purchases/:id` existed on the backend but no Edit button or
form existed anywhere on the Purchases pages — once created, a purchase could
only be returned-from or deleted, never edited.

**Now:** An Edit button on the purchase detail page opens
`PurchaseEditDialog`, which lets you change supplier, purchase date, and
remarks (the only fields the endpoint allows — line items and payments stay
immutable once posted, by design).

### 11.7 Closed — missing report cards

**Was:** Three of the seventeen report endpoints had no card on the Reports
page: Inventory → Stock Movement, Inventory → IMEI Report, and Financial →
Expense Report. All three worked correctly via direct API call and were fully
exportable — they just weren't surfaced anywhere in the UI.

**Now:** All three have a table + `<ExportMenu>` card in their respective
category (Stock Movement and IMEI Register under Inventory, Expenses under
Financial). All 17 report types are now on the page.

### 11.8 Closed — audit logging

**Was:** The `AUDIT_VIEW` permission was seeded and assignable to any role, but
nothing ever wrote an `AuditLog` row and no endpoint or page existed to view
one — checking the permission for a role did nothing.

**Now:** `common/utils/auditLog.ts` provides `logAudit()`/`logAuditFromRequest()`
(fire-and-forget, swallows its own errors so a logging failure never blocks the
real mutation). It's wired into the sensitive actions that matter most: user
create/update/deactivate, role create/update/delete/permission-assignment,
password change and reset, sale cancellation, stock adjustments, and expense
deletion. `GET /audit-logs` (gated by `AUDIT_VIEW`, paginated, filterable by
module/action/user/date range) backs a new Audit Log page in the sidebar.
Verified end-to-end: creating and deleting a test role produced exactly the
expected two rows with correct actor, IP, and description.

### 11.9 In progress — multi-tenant SaaS conversion

**Increment 1 (database multi-tenancy + platform RBAC foundation) is done** — see
§5.0. Every existing module's service/controller is `shopId`-scoped, cross-shop
access is 404 (never a leak), and an automated test suite
(`backend/tests/tenant-isolation.test.ts`, `npm test`) verifies it end-to-end
against the real HTTP API.

**Increment 2 (public shop registration + free trial) is done** — a complete,
demoable vertical slice: `POST /api/v1/registration/shop` (public, rate-limited)
creates a `Shop` + Owner login + that shop's own copy of the 6 default roles + a
30-day `Subscription` (all one transaction) and auto-logs the new owner in; the
`/register` page (linked from `/login`) drives it end-to-end; `GET /api/v1/subscription`
+ the `TrialStatus` component + `/dashboard/subscription` page show the live trial
countdown. Verified: full registration flow via the real API (shop/user/roles/
subscription created correctly, auto-login cookie works, friendly 409s on duplicate
username/email), and the existing tenant-isolation suite still passes unmodified.
Two small refactors landed alongside it to avoid duplication:
`common/constants/defaultRoles.ts` (the 6-role catalog, now shared between
`prisma/seed.ts` and the registration service) and
`common/utils/authCookie.ts` (the cookie-setting logic, now shared between
`/auth/login` and registration).

**Increment 3 (admin shop management + trial enforcement) is done** — the Platform
Admin side now actually does something, and trial expiry has real consequences:
`/api/v1/admin/shops` (list/create/update/suspend/activate/extend-trial, see §7)
plus a full `/admin` frontend area (own layout/sidebar, list/create/detail pages),
and `requireOperationalAccess` (§7) now blocks write actions on Sales, Purchases,
Sales/Purchase Returns, Inventory adjustments, Expenses, Repairs, and Cash Drawer
open/cash-in/cash-out once a shop's subscription is expired/suspended/cancelled —
reads and `/subscription` stay open regardless, so an affected owner can always see
their data and go choose a plan. `common/services/provisionShop.ts` now holds the
one shop-creation transaction shared by both self-registration and admin-created
shops (extracted from `registration.service.ts` in this pass). Verified end-to-end
against the real running API: admin creates a shop with trial → extends its trial
(both "still active" date math, confirmed `+N days` from the *current* end date,
and the "already expired → from now" branch) → suspends it (owner's writes 403 with
`SHOP_SUSPENDED`, reads and `/subscription` still 200) → activates it (owner's
writes reach validation again, no longer blocked); a regular shop user gets 403 from
`/admin/shops`. Two new automated tests in
`backend/tests/operational-access.test.ts` cover the admin-permission and
expired-trial-blocking cases, alongside the existing `tenant-isolation.test.ts`.

**Increment 4 (subscription plans) is done** — a shop can now actually change
plans: `/api/v1/admin/subscription-plans` (Platform Admin CRUD — commercial fields
only, see §7) plus `/admin/subscription-plans` UI; `GET /api/v1/subscription/plans`
+ `POST /api/v1/subscription/select-plan` (§7) plus a new "Available Plans" section
on `/dashboard/subscription` with a `ConfirmDialog`-gated "Switch to this plan"
button per plan. No payment gateway exists (deliberate — spec §40 forbids faking a
successful payment), so selecting a plan is the same manually-managed transition
the app already uses for other subscription state; a priced plan's
`paymentStatus` records `PENDING` rather than claiming payment was collected.
Verified end-to-end against the real running API: admin creates a paid
"Professional" plan → shop owner sees it in their selectable list → selects it →
`/subscription` immediately reflects the new plan/status/dates/`paymentStatus:
PENDING` → confirmed `requireOperationalAccess` (increment 3) still allows writes
against the new subscription (unaffected — its logic only reads
`Subscription.status`/`endDate`, both set correctly by the new plan).

**Increment 5 (platform admin dashboard) is done** — `/admin` is a real landing
page now instead of an immediate redirect: `GET /api/v1/admin/dashboard/summary`
(§7) returns shop status-bucket counts (computed correctly from `Shop.status`, not
raw `Subscription` rows — see §7 for why that distinction matters), expiring-trial
count, total platform users, this-month new-subscription revenue (precisely
labeled, not implying collected/recurring revenue), and the 5 most recent shops;
the frontend mirrors the shop dashboard's own stat-tile + recent-activity-table
layout exactly. Verified against the real API: totals cross-checked against
`/admin/shops`'s own pagination count, a shop user still 403s. Charts (spec §36)
and "Trial Conversion Rate" (spec §35) were deliberately skipped this pass — see
"Not yet built" below.

**Not yet built** (follow-up increments, same rollout this one used — schema
groundwork first, then endpoints):
- Enforcement for the other seven plan-limit fields (`maxMonthlySales`,
  `maxBranches`, `maxStorageMb`, `advancedReports`, `imeiTracking`,
  `repairsEnabled`, `warrantyEnabled`, `multiBranch`) — `maxUsers`/`maxProducts`
  shipped in increment 8 (see below); the rest are deferred, several because
  there's nothing yet to enforce them against (no branch concept, no storage
  tracking) or because gating an entire existing module behind a feature flag
  is a bigger change than "block the Nth create".
- Any real payment gateway/checkout — "selecting" a paid plan today only records
  intent (`paymentStatus: PENDING`); there's no follow-up flow that collects money
  or flips it to `PAID` yet (would need an admin action or gateway webhook).
- Platform dashboard charts (new shops over time, trial conversion, revenue —
  deferred until there's enough shop volume for a chart to mean anything) and
  Trial Conversion Rate (needs proper historical cohort tracking to compute
  correctly, not a fragile approximation).
- PDF/Excel/CSV export for the platform reports (increment 7 shipped the reports
  themselves, view-only — export reusing `export.registry.ts`'s pattern is its
  own follow-up), and additional report types (trial registrations over time).

**Increment 6 (trial warnings + shop archiving) is done** — two small,
self-contained loose ends: `TrialStatus` now escalates to the `destructive` Alert
variant with more urgent phrasing ("ends tomorrow" / "ending soon") once
`daysRemaining` ≤ 3 or the trial has expired (two-tier, not the full 14/7/3/1-day
ladder spec §34 sketches — `Alert` only has two variants); and
`PATCH /api/v1/admin/shops/{id}/archive` (§7) permanently closes a shop
(`Shop.status`/current `Subscription.status` → `CANCELLED`, an `AuditLog` entry,
`activate`/`suspend` both now reject an already-archived shop) with a
destructive, `ConfirmDialog`-gated "Archive Shop" button on the shop detail page
(hidden once already archived). Verified end-to-end: archived a shop, confirmed
double-archive and post-archive activate/suspend are all correctly rejected, the
owner's writes now 403 with the cancelled-subscription message while reads and
`/subscription` still 200.

**Increment 7 (platform reports) is done** — the platform-level counterpart to
the shop-level `reports` module, at a fraction of its size: `GET
/api/v1/admin/reports/shops-performance` (every shop's lifetime sales/purchase
totals + current plan) and `GET /api/v1/admin/reports/subscription-overview`
(shops-per-plan + lifetime revenue-per-plan), both on a new `/admin/reports`
page (§7/§8). Deliberately view-only — no PDF/Excel/CSV export yet, unlike the
17-report-type shop-level apparatus (a much bigger lift than 2 reports justify
today). Verified against the real API: shop-per-plan counts summed to the exact
total shop count (no double-counting), a real shop's lifetime sales/purchase
totals matched its own dashboard figures, revenue-per-plan reflected the actual
paid-plan selection from increment 4, and a shop user still 403s.

**Increment 8 (plan-limit enforcement: users + products) is done** — the first
two of `SubscriptionPlan`'s nine limit/feature fields actually mean something
now, end to end: `common/services/planLimits.ts#checkPlanLimit(shopId,
resource)` (§7) is called as the first line of `createUser`/`createProduct`,
loads the shop's current subscription's plan, and if `maxUsers`/`maxProducts`
is non-null and the shop's current active-row count has already reached it,
throws a new `PlanLimitExceededError` (403, `ErrorCode.PLAN_LIMIT_EXCEEDED`)
naming the plan and the limit and pointing at the Subscription page — a `null`
limit (the seeded default for every existing plan) never blocks, and the check
only guards creation, never editing/deactivating an existing row. Admin can now
set both limits from the plan create/edit form (blank = unlimited, matching the
schema's own convention). The other seven limit/feature fields on
`SubscriptionPlan` are a deliberate, explained deferral — see "Not yet built"
above. Verified end-to-end against the real running API: set `maxUsers: 2`,
`maxProducts: 5` on the Free Trial plan, registered a fresh trial shop,
confirmed the 2nd user and 5th product each succeed and the 3rd
user/6th product each get a clean `PLAN_LIMIT_EXCEEDED` 403; confirmed editing
an existing product and an existing user both still succeed at the limit;
confirmed a shop on a `null`-limit plan (the original single-tenant shop, with
21 products/8 users) is never blocked. Existing test suite stayed green (one
known-flaky connection-drop test, same signature documented since increment 1,
unrelated to this change).

### 11.10 Still out of scope

Two items from the original audit were **not** built — both are genuinely new
feature surfaces rather than gaps in existing functionality, and neither was
requested:

- **Chapter 53 — Notification APIs.** The `Notification` model and
  `NotificationType` enum exist in the schema; nothing creates, reads, or
  updates a row in that table.
- **Chapter 54 — Backup APIs.** No model, no implementation.

### 11.11 Everything else

Every other BRD/SRS module, DDD table, and API Specification chapter has a
working backend endpoint and a fully wired frontend page — Auth, Users, Roles,
Products/Brands/Categories/Models, Inventory, Customers, Suppliers, Purchases (+
returns, now + edit), Sales/POS (+ returns, cancellation, print invoice),
Payments, Cash Drawer, Repairs (+ print receipt), Warranties, Employees,
Expenses, Settings, Reports (all 17 report types have a page card), Export
(PDF/Excel/CSV), Uploads (all 5 types, including the shop logo), and Audit Log.
