# How the Mobile Shop POS Works — A Module-by-Module Walkthrough

This is a guided tour of the application itself: what each module is for, the exact
steps a user takes to use it, and — where it matters — what happens behind the
scenes when they do. For the technical reference (schema, full API list, folder
structure), see `PROJECT_DOCUMENTATION.md`. This file is about *the app in motion*.

The modules below are ordered the way a shop would actually set up and use the
system: access first, then catalog setup, then the day-to-day buying/selling loop,
then the supporting back-office modules.

---

## 1. Logging In & Access Control

**What it's for**: every screen in the app is behind a login. Who can do what is
controlled by roles, and roles are just named bundles of permissions.

**Step by step**:
1. Open the app → redirected to `/login` (you're not authenticated yet).
2. Enter username + password → `POST /auth/login`. On success, the server sets an
   httpOnly cookie (`pos_token`) — the frontend never touches the token directly.
3. Land on `/dashboard`. Every subsequent request automatically carries the cookie.
4. **Forgot your password?** Click "Forgot password?" on the login page → enter your
   email → the app always shows the same "if that account exists, a link was sent"
   message, whether or not the email is real (this is deliberate — it stops someone
   probing which emails have accounts). The actual reset link is currently logged to
   the server console rather than emailed (no email provider wired up).
5. **Resetting**: the link opens `/reset-password?token=...`, you set a new password,
   and you're redirected to log in again.
6. **Changing your password while logged in**: click your avatar (top right) →
   "Change password" → enter your current password + a new one.

**Behind the scenes**: on every single request, the server re-decodes the JWT,
re-loads that user's roles from the database, and re-flattens those roles into a
permission list — nothing about your access is cached. If an admin revokes a
permission from your role right now, your very next click respects that; you don't
need to log out.

**Who can do what** — Owner has every permission; Manager runs day-to-day operations
(products, sales, purchases, customers, suppliers, reports) but can't manage
users/roles; Cashier can only sell, take payments, and manage the cash drawer;
Inventory Staff handles stock and purchasing; Technician handles repairs and
warranties; Accountant handles expenses and financial reports. An Owner can create
entirely custom roles too — Roles → Add Role → check whichever permissions you want.

---

## 2. Dashboard

**What it's for**: the landing page after login — a snapshot of "how's the shop
doing right now."

**What you see**: today's sales total, today's purchases, this month's sales, total
revenue, total expenses, net profit, product/customer/supplier counts, low-stock and
out-of-stock counts (colored amber/red respectively — never color alone, always
paired with a label), pending payments count, pending repairs count, and the 5 most
recent sales and purchases with clickable invoice numbers.

**Behind the scenes**: this is one aggregate query (`GET /dashboard/summary`) that
runs several counts/sums in parallel — it doesn't hit every module's own endpoint.
The page auto-refreshes every 60 seconds while you have it open.

---

## 3. Product Catalog (Brands → Categories → Models → Products)

**What it's for**: everything you can buy or sell has to exist as a Product first,
and every Product needs a Category (required) and optionally a Brand and Model.

**Step by step (setup order matters)**:
1. **Brands** (e.g. "Apple", "Samsung") — Catalog → Brands → Add Brand. Just a name.
2. **Categories** (e.g. "Smartphones", "Accessories") — Catalog → Categories → Add
   Category. Required for every product.
3. **Models** (e.g. "iPhone 15 Pro", tied to a Brand) — Catalog → Models → Add Model.
   Optional but useful for grouping IMEI-tracked phones.
4. **Products** — Catalog → Products → Add Product. Fill in SKU (or let it
   auto-generate), name, category, brand/model, purchase price, selling price, tax
   %, and — the important toggle — **"Tracks IMEI"**.
   - **On** for phones: each physical unit gets its own IMEI, tracked individually
     through purchase → available → sold → (returned) lifecycle.
     Quantity always sells as 1 per line.
   - **Off** for accessories (chargers, cases): tracked by plain quantity, no
     per-unit identity.
5. Optionally upload a product photo (multiple images per product; first one becomes
   the primary/thumbnail).

**Behind the scenes**: creating a product does **not** create stock — a product with
zero stock is perfectly valid until you actually receive it via a Purchase. Toggling
`tracksImei` is what makes the Purchases and Sales screens later require (or not
require) an IMEI field for that product.

---

## 4. Inventory

**What it's for**: the live stock count per product, and the full history of every
quantity change.

**Step by step**:
1. Inventory page shows every product's current quantity, available quantity
   (quantity minus anything reserved), reorder level, and a computed status badge
   (in stock / low stock / out of stock).
2. Filter by category, brand, or stock status.
3. Click a product to see its full movement history — every purchase, sale, return,
   and adjustment that ever touched its stock, each with a signed quantity and a
   reference number (invoice/purchase number) you can trace back.
4. **Manual adjustment**: if a physical count doesn't match the system (damage,
   loss, a miscount), use "Adjustment" — pick increase or decrease, enter the
   quantity, and **a reason is required**. This can't take stock negative.

**Behind the scenes**: you never edit Inventory numbers directly anywhere in the UI
— they only move as a *side effect* of Purchases, Sales, Returns, Repairs (parts
consumption), and this manual Adjustment screen. Every one of those writes an
`InventoryTransaction` row, which is exactly what populates the history view.

---

## 5. Suppliers

**What it's for**: who you buy stock from.

**Step by step**: Suppliers → Add Supplier — name, contact info, payment terms.
Click into a supplier to see their full purchase history and running outstanding
balance (what you currently owe them).

---

## 6. Purchases (Buying Stock)

**What it's for**: recording a delivery from a supplier — this is what actually puts
stock into the system.

**Step by step**:
1. Purchases → New Purchase → pick a supplier.
2. Add line items: product, quantity, purchase price. If the product tracks IMEI,
   you must enter exactly that many IMEI numbers for the line (one box per unit).
3. Optionally record a payment made at the same time (method + amount) — if you pay
   less than the total, the difference becomes what you owe the supplier.
4. Submit. The purchase, its line items, updated stock, registered IMEIs, and the
   payment record are all created **together** — if anything fails partway through
   (e.g. a duplicate IMEI already in the system), nothing is saved.
5. **Returning damaged/wrong stock**: open the purchase → "Return Items" → pick
   quantity per product (and a reason). This reduces stock back down, releases or
   removes the specific IMEIs involved (an already-sold IMEI can't be returned to
   the supplier), and reduces what you owe that supplier.
6. **Deleting a purchase entirely** is only allowed if nothing from it has moved yet
   (no IMEI sold, stock wouldn't go negative) — otherwise you use a Return instead.

**Behind the scenes**: purchase price on the product record is what every later
report uses as the "cost" for profit calculations — there's no per-purchase
historical cost snapshot, so if your purchase price changes over time, past profit
figures shift too (a known simplification, not a bug).

---

## 7. Customers

**What it's for**: who you sell to — optional for walk-in sales, required if you
want to track someone's purchase history or let them buy on credit.

**Step by step**: Customers → Add Customer — name, phone, type (Regular / Wholesale
/ VIP / Corporate), credit limit. Click into a customer to see their full purchase
history and current outstanding balance (what they owe you from unpaid/partial
sales). Optionally attach a document (ID scan) via the photo upload control.

---

## 8. Cash Drawer

**What it's for**: tracking the physical cash in the till across a cashier's shift.
The doc's functional requirement is "a drawer must be opened before sales begin" —
in practice this system treats that as guidance rather than a hard lock (a cash sale
still succeeds with no drawer open; it just won't have anything to log against).

**Step by step**:
1. Cash Drawer page → if nothing's open, enter an opening balance → Open Drawer.
2. As you take cash sales through the day, they **automatically** appear in this
   session's running total — you don't do anything extra.
3. Need to add float or pull cash out mid-shift? Use "Cash In" / "Cash Out", each
   with an amount and an optional note.
4. **End of day**: count the physical cash, enter it as the closing balance, hit
   Close Drawer. The system computes what it *expects* the drawer to hold (opening +
   cash sales + cash-ins − refunds − expenses − cash-outs) and shows you the
   difference between that and what you actually counted — over or short, plain and
   simple.
5. Session history (for managers) shows every past open/close cycle per cashier.

**Behind the scenes**: this only tracks *cash*. A sale paid by card or bank transfer
never touches the drawer total — only `CASH`-method payments and cash refunds do.

---

## 9. Point of Sale — Making a Sale

**What it's for**: the actual selling screen — this is what a cashier lives in.

**Step by step**:
1. Dashboard → "New Sale (POS)".
2. Search for a product, add it to the cart. If it tracks IMEI, scan/type the
   specific unit's IMEI — the system checks it's a real, currently-available unit
   for that exact product before letting you add it.
3. Pick a customer (or leave as walk-in), apply a discount if needed.
4. Choose a payment method and amount paid. Paying less than the total is allowed —
   the remainder becomes due, tracked against the customer's outstanding balance.
5. Complete the sale. In one transaction: stock decreases, the sold IMEI (if any)
   flips to `SOLD` and links to this sale, a warranty record is created automatically
   if the product has a warranty period *and* a customer was selected (walk-in sales
   don't get a warranty even if the product has one), and the payment is recorded.
   If it was a cash payment, it also logs against your currently open cash drawer.
6. An invoice number is generated; the sale now shows up in Sales list and on the
   customer's history.

**Recording more payment later** (for a partially-paid sale): open the sale →
"Record Payment" — pick a method, enter an amount up to what's still due.

**Cancelling a sale**: open the sale → Cancel Sale (with a reason). This reverses
*everything*: stock goes back up, the IMEI returns to `AVAILABLE`, any warranty is
marked cancelled, a refund payment is recorded, and the customer's outstanding
balance adjusts — but nothing is deleted; the sale stays visible, just marked
cancelled, for the audit trail.

**Returning some items from a sale** (without cancelling the whole thing): open the
sale → "Return Items" → pick quantity per product + a reason + refund method. You
can't return more of a product than was actually sold minus what's already been
returned. Stock goes back up, the specific IMEI units come back as `AVAILABLE`, and
a refund is recorded (and logged to the cash drawer if paid in cash).

---

## 10. Payments

**What it's for**: a lightweight standalone way to record a payment against an
existing sale or purchase, beyond what was captured at creation time — mostly used
via the "Record Payment" button on a Sale or Purchase detail page rather than as its
own destination page.

---

## 11. Warranty

**What it's for**: tracking the warranty every sale of a warrantied product
automatically creates, and handling claims when a customer's device fails.

**Step by step**:
1. Warranties page lists every warranty — product, customer, invoice, period,
   expiry date, and status (Active / Expired / Claimed / Cancelled).
2. **Filing a claim**: find an Active warranty → Claim → describe the issue →
   Submit.
3. You're taken straight to a **new Repair ticket** that was just opened
   automatically — pre-filled with the customer, device, IMEI, and the issue you
   just described, at no charge (it's covered).

**Behind the scenes**: an expired warranty can't be claimed (checked against
`expiryDate`, not just the status flag). This claim→repair linkage isn't literally
spelled out in the API spec (which just describes a claim as a status flip) — it was
added because in practice a warranty claim is never the end of the workflow, it's
the start of a repair.

---

## 12. Repairs

**What it's for**: the service department — customer devices coming in for repair,
whether from a warranty claim or a walk-in.

**Step by step**:
1. Repairs → New Repair Ticket → pick a customer, describe the device and IMEI
   (free text — a repair shop routinely services devices it never sold, so these
   aren't required to match a catalog product), describe the problem, optionally
   assign a technician and an estimated cost.
2. Ticket starts at status **Received**. Walk it forward as work happens: Under
   Inspection → Waiting for Parts → In Progress → Ready for Delivery → Delivered
   (or Cancelled at any point). Delivering auto-stamps the delivery timestamp; once
   Delivered or Cancelled, the ticket is locked from further status changes.
3. **Recording parts used**: on the ticket, "Add Part" → pick a product and
   quantity — this genuinely decrements real inventory, same as a sale would.
4. Fill in diagnosis, actual cost (parts + labor combined — there's no separate
   labor line item), and notes as the job progresses; "Save Details" to persist.
5. Optionally attach a photo of the device's condition at intake.

---

## 13. Employees

**What it's for**: shop staff records — technicians, cashiers, anyone who works
there, independent of whether they have a login to this system.

**Step by step**: Employees → Add Employee — name, phone, designation, salary
(optional). Deactivating an employee keeps their record (SRS requirement: employee
history shouldn't disappear) rather than deleting it. Optionally upload a photo.

**Behind the scenes**: every system User is secretly backed by an Employee record
too (Users has no "name" field of its own — it borrows the linked Employee's name),
so you'll see login-holding staff show up in this list alongside employees who have
no login at all, like a repair technician who only ever touches the Repairs screen
in person.

---

## 14. Expenses

**What it's for**: day-to-day shop costs — rent, electricity, salaries, etc. — so
they can be deducted from revenue in the Financial Reports.

**Step by step**: Expenses → Add Expense → pick a category (Shop Rent, Electricity,
Internet, Salaries, Maintenance, Marketing, Transportation, Office Supplies,
Miscellaneous — or type a new one, which gets created on the spot), enter an
amount, payment method, and description. Edit or delete any expense afterward.

---

## 15. Reports

**What it's for**: the "how's the business actually doing" screen, broken into six
switchable categories.

**Step by step**:
1. Reports page → pick a category from the dropdown: Sales, Purchases, Inventory,
   Financial, Customers, or Suppliers.
2. Optionally set a date range (From/To) — most reports respect it; a few (current
   stock levels, current balances) are inherently "right now" and ignore it.
3. Each category shows a mix of headline stat tiles and detail tables:
   - **Sales**: total sales/invoices/average, daily breakdown (with a cash-vs-credit
     split), sales by product (with profit), sales by employee.
   - **Purchases**: totals + pending payments, broken down by supplier.
   - **Inventory**: total stock value, a low-stock table, a full stock-value table.
   - **Financial**: Profit & Loss (sales − cost of goods − expenses) and Cash Flow
     (cash in vs. out across all drawer sessions).
   - **Customers**: who's buying the most, and everyone's outstanding balance.
   - **Suppliers**: what you owe each one, and full payment history.

---

## 16. Exporting Reports

**What it's for**: getting any report out of the browser and into a file you can
print, email, or archive.

**Step by step**: on any report card, click "Export" → pick PDF, Excel, or CSV → the
file downloads immediately, respecting whatever date range is currently set.
Summary-style reports (Total Sales / Total Invoices / Average Sale, for example)
export as a clean two-column "Metric / Value" table rather than one absurdly wide
row of numbers.

---

## 17. Photos & Attachments (Cloudinary)

**What it's for**: the "upload a photo" control that shows up in three places —
Employee photos, Customer attachments (e.g. an ID scan), and Repair device photos.

**Step by step**: wherever you see it (Employee edit dialog, Customer edit dialog,
Repair detail page), click Upload, pick an image, and it's live within a couple of
seconds — no page reload needed. "Replace" swaps it for a new one; "Remove" deletes
it from both the screen and Cloudinary's storage, not just hides it.

**Behind the scenes**: this only works once the record already exists (you can't
attach a photo while still filling out the "Add Employee" form — save first, then
edit to add a photo), same limitation the Product photo upload has always had.

---

## 18. Users & Roles (Administration)

**What it's for**: who can log into the system at all, and what they're allowed to
do once they're in.

**Step by step**:
1. **Users** → Add User — name, username, password, email, and a Role. Editing a
   user lets you change their role or deactivate them (soft delete — the account
   and its history stay, login just stops working). You can't deactivate the last
   remaining Owner account, and you can't deactivate yourself.
2. **Roles** → Add Role — name + description, then a separate "Permissions" action
   opens a checkbox grid (grouped by module) to pick exactly what that role can do.
   Saving *replaces* the role's entire permission set with whatever's checked.

---

## The Shape of a Typical Day

Putting it together, a shop's actual daily loop through these modules looks like:

**Morning**: a cashier opens the cash drawer with a starting float → Manager checks
the Dashboard for yesterday's numbers and any low-stock alerts.

**During the day**: Inventory Staff receives a delivery (Purchase, with IMEIs
registered for any phones) → Cashiers ring up sales all day through the POS screen,
each one automatically touching Inventory, IMEI status, Warranty (if applicable),
and the Cash Drawer → occasionally a customer returns something (Sales Return) or a
device comes in broken (Repair ticket, sometimes from a Warranty claim).

**End of day**: cashier counts the till and closes the Cash Drawer, comparing actual
vs. expected → Accountant logs the day's Expenses → Manager pulls a Reports view
(or exports one) to see how the day went.

Every one of those actions is one of the modules above, and every one of them
updates the same underlying Inventory/Payment/Cash-Drawer records the *other*
modules read from — nothing in this system is siloed; a sale today shapes the
Inventory report, the Cash Flow report, and the Dashboard tomorrow morning.
