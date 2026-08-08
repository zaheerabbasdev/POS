# Feature Ideas — Mobile Shop POS

A running list of features that would take this system from "fully functional" to
"industry level." Nothing here is built yet — this is a menu to pick from, not a
promise of what's coming. Each item says what it does, why it helps, and roughly
how big a job it is, so you can prioritize by what actually matters for how your
shop runs.

**How to use this file:** tell me which items you want, in any order, and I'll build
them one at a time. Check a box (`- [x]`) once something is actually built and
verified, so this file stays an honest record of what's done vs. still an idea.

---

## 1. Point of Sale (checkout screen) improvements

- [ ] **Split payment** — let a customer pay part cash, part card, on one sale
  (e.g. 30,000 cash + 20,000 card for a 50,000 phone). Right now checkout only
  takes one payment method per sale. *Quick win.*
- [ ] **Discount on a single item, not just the whole cart** — e.g. 500 off just
  a phone cover, without discounting the phone next to it in the same sale.
  *Quick win.*
- [ ] **Add a new customer without leaving the sale screen** — a "+ New Customer"
  option right inside the checkout customer picker, instead of stopping the
  sale to go to a different page first. *Quick win.*
- [ ] **Auto-open the printable invoice right after checkout** — right now you
  land on the sale's details page and have to click "Print Invoice" yourself.
  *Quick win.*
- [ ] **One-motion barcode scanning** — after a barcode scan, the item should go
  straight into the cart. Right now you still have to click it in a dropdown
  after scanning. *Quick win.*
- [ ] **Keyboard shortcuts for cashiers** — e.g. Enter to complete the sale, Esc
  to clear the cart — for fast checkout without reaching for the mouse.
  *Quick win.*
- [ ] **"Hold" a sale and come back to it later** — for when a customer's items
  are in the cart but they need to step away (forgot their wallet, etc.).
  Right now leaving the page loses the cart. *Medium — needs a new "draft sale"
  concept.*
- [ ] **Quick-tap buttons for best-selling items** — a row of your most common
  items (chargers, covers, screen protectors) as one-tap buttons above search,
  instead of typing the same searches all day. *Quick win.*
- [ ] **Live stock updates across open POS screens** — if two cashiers are
  selling at once and one sells the last unit, the other's screen should
  instantly show "0 left" instead of a stale number. *Medium — needs a live-update
  mechanism.*
- [ ] **Send the receipt by WhatsApp/SMS** — instead of only printing, text the
  customer their invoice directly. *Medium — needs a messaging provider set up.*

---

## 2. Money & payments

- [ ] **Sell on installments / EMI** — very common for phone shops. Customer pays
  part now, the rest in scheduled installments (e.g. monthly), and the system
  tracks who owes what and when, marking the sale fully paid once the last
  installment lands. *Bigger project.*
- [ ] **Trade-in / buy old phone as part payment** — record an old phone taken
  in as partial payment toward a new one, with its own value subtracted from
  the new sale's due amount. *Medium.*
- [ ] **Gift cards / store credit** — sell a voucher a customer can redeem later,
  or issue store credit for a return instead of cash back. *Medium.*

---

## 3. Customers & growth

- [ ] **Loyalty points / rewards** — e.g. earn 10 points per 1,000 spent, redeem
  points for a discount later. Encourages repeat customers instead of
  one-time sales. *Medium.*
- [ ] **WhatsApp/SMS notifications** — "your repair is ready for pickup,"
  birthday offers, promotional messages — sent automatically instead of manual
  phone calls. *Medium — needs a messaging provider set up.*
- [ ] **Repair appointment booking** — let customers book a repair slot ahead of
  time ("Tuesday 3pm") instead of only walk-ins. *Medium.*

---

## 4. Business insights

- [ ] **Real charts on the Reports page** — visual graphs (sales trending up,
  best-selling products) instead of only tables of numbers. *Quick–medium win.*
- [ ] **Low-stock auto-alerts** — get notified the moment something drops below
  its reorder level, instead of finding out only when you check Inventory or a
  customer asks for something you don't have. *Quick–medium win.*
- [ ] **Employee performance / commission tracking** — see who's selling the
  most, and optionally calculate commission automatically. *Medium.*

---

## 5. Security & reliability

- [ ] **Automatic backups + restore** — scheduled daily backups of the whole
  database, with an easy way to restore if something is deleted or corrupted
  by mistake. *Medium — no restore path exists today.*
- [ ] **Two-step login verification (2FA)** — after the password, require a code
  sent to phone/email, protecting the account even if a password leaks.
  *Medium.*
- [ ] **Session / device management** — see which devices are logged into an
  account, and log out a lost/stolen device remotely. *Medium.*

---

## 6. Growing the business

- [ ] **Multiple shop branches** — if you open a second location, track separate
  inventory/sales/staff per branch while still seeing combined totals for the
  whole business. *Bigger project — touches most modules.*
- [ ] **Works without internet (offline mode)** — keep selling even if the
  shop's internet goes down, syncing everything automatically once it's back.
  *Bigger project.*
- [ ] **Multi-language support (e.g. Urdu)** — switch the interface language for
  staff who are more comfortable in Urdu than English. *Medium.*

---

## 7. Legal / compliance

- [ ] **Tax-compliant invoices (e.g. FBR / sales tax rules)** — if your business
  is required to submit sales tax invoices to a tax authority, the invoice
  format and numbering may need to follow specific rules. Worth checking
  whether this applies to your business size before building it. *Depends on
  your legal requirement — needs your input on the exact rules to follow.*

---

## Already built (for context — not on this list because it's done)

Everything in this section already exists and works, confirmed earlier this
session: Sales/POS (with split-safe stock handling), Purchases, Returns (sales +
purchase), Inventory with reorder levels, Customers, Suppliers, Repairs,
Warranties, Employees, Expenses, Cash Drawer, Users & Roles with permission-based
access, Settings (shop name/logo/currency), Audit Log, Reports & Exports
(PDF/Excel/CSV), Cloudinary photo uploads, printable Sale invoices and Repair
receipts, and password-reset emails.

Two items were identified early on as intentionally not built because nobody
asked for them yet: **Notifications** (an in-app bell/alerts feed) and a basic
**Backup API** — both would be natural building blocks for several ideas above
(Notifications ties into low-stock alerts and WhatsApp/SMS; Backup ties into
"automatic backups + restore").
