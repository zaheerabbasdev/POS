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

### 5.1 Domain groups

| Domain | Models |
|---|---|
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
  edits apply immediately.
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

**Public**: `/login`, `/forgot-password`, `/reset-password`

**Authenticated** (all under `/dashboard`):

| Route | Purpose |
|---|---|
| `/dashboard` | Real-data landing page — stat tiles + recent sales/purchases |
| `/dashboard/pos` | Point-of-sale screen (product search, cart, checkout) |
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

**Backend** (`backend/.env` — see `.env.example`):
```
DATABASE_URL=prisma+postgres://localhost:51213/?api_key=...   # from `prisma dev`
DIRECT_DATABASE_URL=postgres://postgres:postgres@localhost:51214/template1
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
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

Seeded admin login: `admin` / `Admin@12345` (seed script prints a warning to change
it immediately).

**Frontend**:
```bash
cd frontend
npm run dev               # http://localhost:3000
```

---

## 11. What's Not Built

Two chapters of the original API Specification volume were never implemented:

- **Chapter 53 — Notification APIs** (`GET /notifications`, `PATCH
  /notifications/:id/read`, `POST /notifications`). The `Notification` model exists
  in the schema (unused).
- **Chapter 54 — Backup APIs**. No corresponding model or discussion yet.

Everything else in the 6-volume doc — every BRD/SRS module, every DDD table, every
API Specification chapter through Chapter 52 (Cloudinary uploads) — has a working
backend endpoint, and the large majority also have a wired-up frontend page. The
Settings module (Chapter 30 — shop name/address/logo/currency/timezone) has no
dedicated CRUD endpoints or page yet either, though the underlying `Setting`
key-value table already stores the shop logo URL from the Uploads module.
