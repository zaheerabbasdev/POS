# BUG-010 — A Returned or Cancelled Phone Could Never Be Sold Again

**Bug ID:** BUG-010
**Bug title:** `sale_items.imei_id` was unique, so an IMEI already on any past sale line (returned or cancelled) failed on resale with "A record with these values already exists"
**Date:** 2026-09-28 (found while verifying BUG-006's fix, fixed same day)
**Severity:** High — a returned phone shows as available at the till but can't be sold; stock is effectively stuck
**Module:** Database schema (`SaleItem`), Sales

---

## Problem description

After a return or cancellation the phone's IMEI goes back to `AVAILABLE` and
appears in the POS. Selling it failed with a 409 "A record with these values
already exists", because the original sale line still pointed at that IMEI
and `SaleItem.imeiId` was `@unique` (one-to-one, per DDD Table 22).

## Symptoms

Returned phones visible as in stock, but every attempt to sell them errors.

## Root cause

A schema constraint modelled "one IMEI → one sale line ever", while the app
lets a phone come back and be resold.

## Reproduction steps

1. Sell a phone; return it (or cancel the sale).
2. Sell the same IMEI again → 409 "A record with these values already exists".

## Expected vs actual behavior

Expected: sale succeeds. Actual: unique-constraint error.

## Architecture diagram (ASCII)

```
 ImeiNumber 1 ──── * SaleItem      (was 1 ──── 0..1)
      │ saleId → the sale that has the phone NOW
```

## Request/response communication flow

No API shape change.

## Sequence of events

Migration drops the unique index `sale_items_imei_id_key` and adds a plain
index `sale_items_imei_id_idx`.

## Files modified

- `backend/prisma/schema.prisma` (`SaleItem.imeiId`, `ImeiNumber.saleItems`)
- `backend/prisma/migrations/20260928000000_allow_imei_resale/migration.sql`

## Code changes summary

Relation changed to one-to-many; the unused back-relation `saleItem` became
`saleItems`. No application code used it.

## Why the fix works

History lines keep their IMEI reference; the current owner is read from
`ImeiNumber.saleId`, which BUG-006's return logic already relies on.

## Side effects

None found. Deliberate DDD deviation, documented in `schema.prisma` and
`PROJECT_DOCUMENTATION.md` §5.

## Testing performed

End-to-end: return a phone, resell the same IMEI to another customer
(succeeds), then return the other phone from the original sale; the resold
phone stays with its new buyer.

## Prevention strategies

When a record can go through a lifecycle loop (sold → returned → sold),
avoid unique constraints on the per-cycle link.

## Lessons learned

The bug hid behind the return bugs: nobody got far enough to resell a
returned phone until returns were fixed.

## Related bugs

BUG-006.

## References

DDD Table 22 (`sale_items`).
