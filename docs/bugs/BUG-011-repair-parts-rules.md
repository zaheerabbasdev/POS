# BUG-011 — Repair Parts Could Be Added to Closed Repairs, Phones Could Be Used as Parts

**Bug ID:** BUG-011
**Bug title:** "Record Parts Used" accepted delivered/cancelled repairs and IMEI-tracked products, and its stock check wasn't race-safe
**Date:** 2026-09-27 (found in review) / 2026-09-28 (fixed and verified)
**Severity:** Low-Medium — stock/IMEI mismatch and parts consumed on closed tickets
**Module:** Repairs (`backend/src/modules/repairs/`)

---

## Problem description

1. Parts could be recorded on a DELIVERED or CANCELLED repair.
2. Using a phone (IMEI product) as a part reduced the quantity but left its
   IMEI `AVAILABLE`, so it could still be sold.
3. The stock check ran before the transaction; two technicians using the last
   part at once could both succeed.

## Symptoms

Stock counts not matching the number of available IMEIs; parts on closed
tickets.

## Root cause

Status and product-type checks were missing; the decrement was an
unconditional `update`.

## Reproduction steps

Cancel a repair, then Record Parts Used → accepted.

## Expected vs actual behavior

Expected: refused with a clear message. Actual: accepted.

## Architecture diagram (ASCII)

```
 addRepairItem ─ status check ─ not IMEI ─ atomic updateMany(availableQuantity >= qty)
```

## Request/response communication flow

Unchanged shape; new 409/400 errors.

## Sequence of events

Check repair open → reject IMEI products → atomic decrement → log inventory
transaction.

## Files modified

- `backend/src/modules/repairs/repair.service.ts`
- `frontend/app/dashboard/repairs/[id]/add-part-dialog.tsx` (hides IMEI products)

## Code changes summary

Guards added; decrement switched to the same atomic pattern Sales uses.

## Why the fix works

Guards stop the invalid cases; the conditional update makes the stock check
and the decrement one step.

## Side effects

A phone can't be consumed as a repair part. A phone replacement belongs in the
warranty/replacement flow, not here.

## Testing performed

End-to-end: phone as part refused; normal part accepted; part on a cancelled
repair refused.

## Prevention strategies

Use the atomic `updateMany … availableQuantity >= qty` pattern for every stock
decrement.

## Lessons learned

The atomic pattern was applied to Sales only; other stock consumers copied the
older, non-atomic approach.

## Related bugs

BUG-008 (same missing stock floor in purchase returns).

## References

SRS Module 19.
