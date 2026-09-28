# BUG-008 — Supplier Returns Could Drive Stock Negative and Returned Goods Could Be Paid For Again

**Bug ID:** BUG-008
**Bug title:** Purchase returns didn't check shelf stock, valued goods at pre-discount price, and weren't counted in what's still owed on the purchase
**Date:** 2026-09-27 (found in review) / 2026-09-28 (fixed and verified)
**Severity:** High — negative stock and double payments to suppliers
**Module:** Purchase Returns (`backend/src/modules/purchaseReturns/`), Purchases, Payments

---

## Problem description

1. Buy 10 covers, sell 8, return all 10 to the supplier: accepted; stock −8.
2. After returning goods, the purchase still showed the full total as owed,
   so the shop could pay the supplier again for goods it had sent back.
3. Returned units were valued at the first line's `purchasePrice`, ignoring
   line and purchase-level discounts.
4. Deleting a purchase that had returns failed with a raw database error.
5. The same IMEI typed twice on one purchase failed with a raw database error.

## Symptoms

Negative available stock; supplier outstanding balance going too low after
paying the "remaining due"; purchases stuck in PARTIAL/PENDING after a
return that fully covered them.

## Root cause

Only IMEI products were checked against available units; plain-quantity
products decremented inventory without a floor. Purchase "due" was computed
as `total − paid` in `createPayment`/`getPaymentHistory`, never subtracting
`PurchaseReturn.returnAmount`. No check for existing returns before delete.

## Reproduction steps

1. Purchase 10 covers (unpaid). Sell 8.
2. Purchase return: 10 covers → succeeds, stock −8.
3. Record a supplier payment for the full purchase total → succeeds.

## Expected vs actual behavior

| Case | Expected | Actual (before) |
|---|---|---|
| Return 10 with 2 on the shelf | Refused | Accepted, stock −8 |
| Pay full total after returning 200 | Refused; 800 owed | Accepted |
| Delete purchase with returns | Clear refusal | 500 / constraint error |

## Architecture diagram (ASCII)

```
 Purchase page ──► POST /purchase-returns ──► lock purchase (FOR UPDATE)
                                              atomic inventory updateMany (availableQuantity >= qty)
                                              value = discounted unit cost
                                              update paymentStatus via getPurchaseBalance()
 Payments ──► supplier branch ──► getPurchaseBalance(): due = total − paid − returned
```

## Request/response communication flow

`POST /purchase-returns` items accept optional `imeis`. `GET /purchases/:id`
now returns `paidAmount`, `returnedAmount`, `dueAmount`, `returnedQuantities`,
and per-item `availableImeis`.

## Sequence of events

Lock purchase → re-check returnable quantities inside the transaction →
pick exact or any unsold IMEIs → value at discounted cost (capped at what's
not yet returned) → atomic stock decrement (fails cleanly if sold) → reduce
supplier balance → recompute purchase status.

## Files modified

- `backend/src/modules/purchases/purchaseBalance.ts` (new)
- `backend/src/modules/purchaseReturns/purchaseReturn.service.ts`, `.validation.ts`
- `backend/src/modules/purchases/purchase.service.ts`
- `backend/src/modules/payments/payment.service.ts`
- `frontend/app/dashboard/purchases/[id]/purchase-return-dialog.tsx`, `page.tsx`
- `frontend/lib/api/purchases.ts`, `purchase-returns.ts`

## Code changes summary

`getPurchaseBalance`/`purchasePaymentStatus` helpers; return service rewritten
in one locked transaction; supplier payments checked against the true due
under a row lock; purchase create rejects duplicate IMEIs, oversized
discounts and payment over the total; delete blocked when returns exist; the
return dialog shows "Not returned" and IMEI checkboxes; the purchase page
shows Paid / Returned to supplier / Still owed.

## Why the fix works

The stock floor is enforced atomically by the database update itself, and
there is now a single definition of "owed on this purchase" that every path
uses.

## Side effects

Supplier outstanding balance can still go negative when goods are returned on
an already-paid purchase. That's intended: it means the supplier owes the shop.

## Testing performed

End-to-end (in the 55-check run): return 10 with 2 left refused, stock stays
2; returning the 2 works; purchase shows 800 owed after a 200 return; paying
1,000 refused, 800 accepted → PAID; delete refused; named phone returned to
supplier; a phone currently sold to a customer refused.

## Prevention strategies

Use `getPurchaseBalance` for any new supplier-money feature; never compute
purchase due inline.

## Lessons learned

The IMEI path had a stock check and the plain-quantity path didn't, because
the check was written per product type rather than at the inventory update.

## Related bugs

BUG-006, BUG-007.

## References

API Spec 31, 33.2, 36.2.
