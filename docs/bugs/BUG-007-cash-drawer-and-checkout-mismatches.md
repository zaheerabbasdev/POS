# BUG-007 — Cash Drawer Expected Balance Didn't Match the Real Till

**Bug ID:** BUG-007
**Bug title:** Change was counted as sale money, later cash payments and cash expenses never reached the drawer, and every cancellation refund came out of the drawer as cash
**Date:** 2026-09-27 (found in review) / 2026-09-28 (fixed and verified)
**Severity:** High — end-of-shift "difference" was wrong in both directions, hiding real shortages or inventing fake ones
**Module:** Sales checkout (`sales/sale.service.ts`), Payments, Expenses, Cash Drawer; POS screen

---

## Problem description

1. **Overpayment recorded as a sale.** Typing the 5,000 note received for a
   1,000 bill recorded 5,000 paid and added 5,000 to the drawer, though
   4,000 went straight back as change.
2. **Later cash payments skipped the drawer.** A customer paying off a credit
   sale in cash increased the real till but not the expected balance.
3. **Cash expenses skipped the drawer.** The drawer's "Expenses" line was
   always 0 (nothing ever wrote an `EXPENSE` drawer transaction).
4. **Cancellation refunds were always cash.** A card sale cancelled was
   refunded "in cash" and taken out of the drawer.
5. **Discounts bigger than the bill** produced a negative sale total.

## Symptoms

Drawer "difference" at close was off by change given, later cash
collections, and cash expenses. Card cancellations made the drawer look
short. Sales with negative totals.

## Root cause

`createSale` stored every payment entry as-is. `createPayment` had no drawer
call. `expense.service.ts` had no drawer call. `cancelSale` hard-coded
`paymentMethod: "CASH"` and always called `recordDrawerMovement`. No lower
bound on `totalAmount`.

## Reproduction steps

1. Open the drawer with 1,000.
2. Sell a 1,000 charger, type 5,000 cash received.
3. Drawer summary shows expected 6,000; the till holds 2,000.

## Expected vs actual behavior

| Case | Expected | Actual (before) |
|---|---|---|
| 5,000 cash for 1,000 bill | Paid 1,000, drawer +1,000, change 4,000 shown | Paid 5,000, drawer +5,000 |
| Card amount over the bill | Refused (typing mistake) | Accepted |
| Later cash payment of 1,000 | Drawer +1,000 | Drawer unchanged |
| Cash expense 300 today | Drawer −300 | Drawer unchanged |
| Cancel a card sale | Refund by card, drawer unchanged | Cash refund, drawer −amount |
| Discount 5,000 on 1,000 bill | Refused | Sale total −4,000 |

## Architecture diagram (ASCII)

```
 POS ──► createSale ──► settlePayments() ── change removed from cash entries
                    └─► recordDrawerMovement(SALE, cash kept)
 Sale page ──► createPayment ──► recordDrawerMovement(SALE)        [new]
 Expenses ──► create/update/delete ──► drawer EXPENSE entry        [new]
 Sale page ──► cancelSale ──► refund via original method; drawer only if CASH
```

## Request/response communication flow

`POST /sales` response now includes `changeGiven`.
`PATCH /sales/:id/cancel` accepts optional `refundMethod`.
Expense endpoints unchanged in shape; controller now passes the user id.

## Sequence of events

Checkout: sum payments → if over the bill, the excess must be coverable by
cash entries → subtract it from cash entries (last first) → record trimmed
payments → drawer gets the trimmed cash only.

## Files modified

- `backend/src/modules/sales/sale.service.ts`
- `backend/src/modules/payments/payment.service.ts`
- `backend/src/modules/expenses/expense.service.ts`, `expense.controller.ts`
- `backend/src/modules/cashDrawer/cashDrawer.service.ts` (`EXPENSE` type allowed)
- `frontend/app/dashboard/pos/page.tsx` ("Change to give", discount warning)
- `frontend/app/dashboard/sales/[id]/page.tsx` (refund method on cancel)

## Code changes summary

- `settlePayments()` in sale service; `changeGiven` returned.
- Sale/line discount validation.
- Customer payments in cash call `recordDrawerMovement(SALE)`.
- Cash expenses dated today (±1 day for time zones) write an `EXPENSE`
  drawer entry referenced by expense number; edit/delete keep it in step
  while that drawer session is still open.
- `cancelSale` refunds via the sale's single payment method (cash if split),
  or an explicit `refundMethod`.

## Why the fix works

The drawer's expected balance is now built from exactly the cash that
physically moves: cash kept at the counter, cash collected later, cash paid
out for expenses and cash refunds, nothing else.

## Side effects

- Supplier payments still don't touch the drawer (shops usually pay
  suppliers from outside the till; deliberate).
- A back-dated cash expense doesn't touch today's drawer.
- Expense edits after the drawer session has closed don't change that
  closed session.

## Testing performed

End-to-end against the running API (part of the 55-check run): change of
4,000 reported and drawer +1,000 only; card overpay refused; card 700 +
cash 500 on a 1,000 bill gives 200 change from the cash part; later cash
payment +1,000 in drawer; expense +300, edit to 500, switch to bank transfer
(removed), back to cash (restored), delete (removed); back-dated expense
ignored; card sale cancel refunds as CREDIT_CARD with drawer untouched;
explicit cash refund reduces drawer by 1,000; oversized discounts refused.

## Prevention strategies

Every code path that records a CASH payment, refund or expense should go
through `recordDrawerMovement` — grep for `paymentMethod: "CASH"` and
`method === "CASH"` when adding new money flows.

## Lessons learned

"Amount tendered" and "amount paid" are different numbers; the POS only
ever had one field for both.

## Related bugs

BUG-006 (return refunds), BUG-008 (supplier payments).

## References

SAD Chapter 26 (Cash Drawer), API Spec 34.3, 36.2, 43.
