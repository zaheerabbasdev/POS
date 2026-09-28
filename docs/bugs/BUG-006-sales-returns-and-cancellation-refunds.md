# BUG-006 — Sales Returns and Cancellations Refunded the Wrong Amount, Released the Wrong Phone, and Double-Counted

**Bug ID:** BUG-006
**Bug title:** Sales returns ignored what the customer actually paid/owed and which units were already back; cancelling after a return reversed everything a second time
**Date:** 2026-09-27 (found in review) / 2026-09-28 (fixed and verified)
**Severity:** Critical — direct money loss (cash paid out that was never taken in, refunds larger than the sale) and stock/IMEI corruption
**Module:** Sales Returns (`backend/src/modules/salesReturns/`), Sales cancel (`backend/src/modules/sales/`), Payments (`backend/src/modules/payments/`)

---

## Problem description

Five related defects, all from one gap: a sales return never recorded its
effect on the sale's own money (`paidAmount`/`dueAmount`), and nothing tracked
*which* sold units were still with the customer.

1. **Credit-sale returns paid out cash.** A 50,000 phone sold on credit
   (nothing paid) and then returned produced a 50,000 cash REFUND *and*
   cleared the customer's debt.
2. **Refunds ignored discounts.** The refund used list price
   (`sellingPrice`), not what the customer was charged. A phone sold at 50,000
   with a 5,000 discount refunded 50,000.
3. **Cancel after a return reversed everything again.** Cancelling a sale
   restocked *every* line and refunded the full `paidAmount`, including the
   units already returned (and already refunded).
4. **The wrong phone was released.** Returns allocated "greedily from the
   first sold line" every time, so a second return of a two-phone sale
   released the *first* phone again, even if it had since been resold to
   someone else. The phone actually coming back stayed `SOLD`.
5. **Payments were accepted on cancelled sales,** pushing the customer's
   balance negative (cancel had already cleared it).

## Symptoms

- Cash drawer short after returns of credit sales.
- Refund amounts higher than the sale's total.
- Stock counts one or more too high after "return then cancel".
- A phone showing `AVAILABLE` while physically with a customer; another
  showing `SOLD` while back on the shelf.
- Negative customer outstanding balances.

## Root cause

`createSalesReturn` computed `refund = qty × sellingPrice`, always created a
REFUND payment for that full amount, and decremented the customer balance by
`min(refund, sale.dueAmount)`, without touching `sale.paidAmount`/`dueAmount`.
The sale therefore looked unchanged to every later step (a second return,
a cancellation, a payment). Allocation to sold lines started at the first
line on every call, with no record of which lines had been returned.
`cancelSale` iterated all `sale.items` unconditionally. `createPayment`
never checked `isCancelled`.

## Reproduction steps

1. Sell a phone at 50,000 on credit to a customer, no payment.
2. Return it from the sale page, refund method Cash.
3. Observe: a 50,000 REFUND payment, drawer −50,000, customer balance 0.

(For 3/4: sell 2 chargers, return 1, cancel the sale. Stock rises by 3 and
3,000 is refunded on a 2,000 sale.)

## Expected vs actual behavior

| Case | Expected | Actual (before) |
|---|---|---|
| Return from unpaid credit sale | No cash out; debt reduced by 45,000 | 50,000 cash out and debt cleared |
| Return of discounted phone | Refund 45,000 | Refund 50,000 |
| Return 1 of 2, then cancel | Total refund 2,000; stock +2 | Refund 3,000; stock +3 |
| Second phone return | Releases phone B | Releases phone A again |
| Payment on cancelled sale | Refused | Accepted, balance negative |

## Architecture diagram (ASCII)

```
 Sale detail page ──► POST /sales-returns ──► createSalesReturn()
        │                                        │  lock sale row (FOR UPDATE)
        │                                        │  computeHeldQuantities()  ─┐
        │                                        │  computeUnitValues()       ├─ saleReturnState.ts (shared)
        │                                        │  credit first, cash rest   │
        └──► PATCH /sales/:id/cancel ──► cancelSale()                         │
                                                 │  lock sale row             │
                                                 │  computeHeldQuantities() ──┘
                                                 └  refund net paidAmount only
```

## Request/response communication flow

`POST /api/v1/sales-returns` `{ saleId, items: [{ productId, quantity, imeis? }], refundMethod }`
→ `201 { ...return, refundAmount (goods value), creditApplied, cashRefunded }`.
`PATCH /api/v1/sales/:id/cancel` `{ reason?, refundMethod? }` → sale detail.

## Sequence of events

1. Lock the sale row so a concurrent return/cancel waits.
2. Work out which units are still held: phones by the IMEI's current
   `saleId`, other products by consuming the total returned quantity across
   lines in a fixed order.
3. Value the returned units at their discounted price.
4. Apply the value to `dueAmount` first (`creditApplied`), then pay back the
   rest (`cashRefunded`, capped by `paidAmount`).
5. Update the sale's `paidAmount`/`dueAmount`/`paymentStatus`, restock,
   release IMEIs, cancel fully-returned warranties.
6. Record a REFUND payment (and drawer movement if cash) only for the cash part.

## Files modified

- `backend/src/modules/sales/saleReturnState.ts` (new)
- `backend/src/common/utils/money.ts` (new)
- `backend/src/modules/salesReturns/salesReturn.service.ts`, `salesReturn.validation.ts`
- `backend/src/modules/sales/sale.service.ts`, `sale.controller.ts`, `sale.validation.ts`
- `backend/src/modules/payments/payment.service.ts`
- `frontend/app/dashboard/sales/[id]/sales-return-dialog.tsx`, `page.tsx`
- `frontend/components/confirm-modal.tsx` (optional `children`)
- `frontend/lib/api/sales.ts`, `sales-returns.ts`

## Code changes summary

- New shared helpers `computeHeldQuantities`, `computeUnitValues`,
  `paymentStatusFor`.
- `createSalesReturn` rewritten inside one transaction with a row lock;
  rejects duplicate product lines; accepts exact IMEIs.
- `cancelSale` reverses only held units, refunds the net `paidAmount` via
  the original payment method (or a chosen one), zeroes `dueAmount`.
- Sale detail exposes `returnedQuantity` per line.
- `createPayment` rejects cancelled sales and applies the payment with an
  atomic `updateMany … where dueAmount >= amount`.
- Return dialog: "Can return" column, IMEI checkboxes, live preview of
  "taken off what they owe" vs "money to give back".

## Why the fix works

The sale's own `paidAmount`/`dueAmount` now always reflect returns, so every
later step (return, cancel, payment) starts from the true remaining position.
The invariant `paid + due = value of goods still with the customer` holds
after each operation. IMEI ownership is read from the IMEI itself, which is
the only record that stays correct after a resale.

## Side effects

- `SalesReturn.refundAmount` now means *goods value returned*; the cash
  actually handed back is the REFUND payment row (and `cashRefunded` in the
  create response). Older returns recorded list-price refunds; they're left
  as-is.
- Cancelled sales now have `dueAmount = 0`.
- Returns from sales made before this fix still work; the cancel refund is
  capped by the value of goods still held to avoid over-refunding them.

## Testing performed

End-to-end script against the running API on a fresh trial shop (55 checks,
all passing), including: credit-sale return (no cash, debt cleared); discount
honoured (45,000 not 50,000) and invoice-level discount spread (900 for 1 of
2 chargers with a 200 bill discount); return-then-cancel (2,000 total, stock
restored exactly); two-phone sale with a resale in between (correct phone
released, resold phone untouched, third return refused); payment on a
cancelled sale refused; two simultaneous returns of the last unit (exactly
one succeeds, one refund); double cancel (exactly one succeeds).

## Prevention strategies

- Any operation that changes what a customer owes must update the sale's
  `paidAmount`/`dueAmount` in the same transaction.
- Reuse `saleReturnState.ts` for any future feature that asks "what does the
  customer still have?" (exchanges, warranty replacements).
- Lock the parent row (`SELECT … FOR UPDATE`) before read-check-write
  sequences on money.

## Lessons learned

A refund is a function of what was *charged and paid*, not of the price
list. Storing only the "return happened" fact without its money effect made
every downstream calculation silently wrong.

## Related bugs

BUG-007 (cash drawer mismatches, including cancel refunds always in cash),
BUG-009 (reports counting returns as sales), BUG-010 (returned phones
couldn't be resold).

## References

`backend/src/modules/sales/saleReturnState.ts`; API Spec Ch. 34.4, 35.2;
`PROJECT_DOCUMENTATION.md` §7 (Sales Returns).
