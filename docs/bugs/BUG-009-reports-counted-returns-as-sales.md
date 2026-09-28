# BUG-009 — Dashboard and Reports Counted Returned Items as Sales

**Bug ID:** BUG-009
**Bug title:** Sales totals, profit, and per-product/per-cashier/per-customer figures never subtracted sales returns
**Date:** 2026-09-27 (found in review) / 2026-09-28 (fixed and verified)
**Severity:** Medium — no money moved wrongly, but revenue and profit were overstated
**Module:** Reports (`reports/report.service.ts`), Dashboard, Platform reports

---

## Problem description

Every sales figure summed non-cancelled `Sale.totalAmount` only. A phone sold
and then returned still counted in today's sales, monthly sales, total
revenue, the sales/profit reports and the platform admin's shop totals.

## Symptoms

Dashboard "Today's Sales" higher than the money actually kept; profit
overstated by the returned goods' margin.

## Root cause

No query anywhere read `SalesReturn`.

## Reproduction steps

Sell a 1,000 item, return it, open the dashboard: Today's Sales = 1,000.

## Expected vs actual behavior

Expected 0 net sales (1,000 gross − 1,000 returns); actual 1,000.

## Architecture diagram (ASCII)

```
 report.service.ts
   findReturns(range, saleFilter)      ── returns of non-cancelled sales, by returnDate
   findReturnedProducts(range)         ── per-product qty / value / cost
 dashboard.service.ts   ── subtract returns (today / month / all time)
 platformReport.service ── subtract returns per shop
```

## Request/response communication flow

`GET /reports/sales/summary` adds `grossSales` and `totalReturns`;
`totalSales` is now net. `GET /reports/sales/daily` rows add `returns`.
Dashboard fields keep their names and string format, now net.

## Sequence of events

Returns are dated by when the goods came back (the usual accounting rule),
filtered by the same cashier/customer/status filters as the sales query, and
subtracted.

## Files modified

- `backend/src/modules/reports/report.service.ts`
- `backend/src/modules/dashboard/dashboard.service.ts`
- `backend/src/modules/platformReports/platformReport.service.ts`

## Code changes summary

Sales summary, daily, product, employee, profit-and-loss, customer-purchase
reports, dashboard and platform shop totals subtract returns; profit also
removes the returned goods' cost.

## Why the fix works

Returns are subtracted at the same level every figure is computed at, using
the goods value stored on each return (see BUG-006).

## Side effects

- A return of an item sold in an earlier period lowers the current period's
  net sales (standard practice).
- Returns created before BUG-006's fix were valued at list price, so historical
  totals may be slightly low.

## Testing performed

End-to-end: sales summary `totalSales == grossSales − totalReturns`;
dashboard Today's Sales equals the report's net total; profit-and-loss sales
match.

## Prevention strategies

When adding a sales figure, include returns: search for `sale.aggregate` and
check `findReturns` is applied.

## Lessons learned

Cancelled sales were excluded from day one, but returns (partial reversals)
were never modeled in reporting.

## Related bugs

BUG-006.

## References

API Spec Ch. 44–49.
