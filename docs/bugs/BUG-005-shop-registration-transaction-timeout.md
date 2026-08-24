# BUG-005 — Shop registration: transaction timeout (P2028)

**Status:** Fixed and deployed.
**Date:** 2026-08-24.

## Summary

`POST /api/v1/registration/shop` returned `500 { code: "SERVER_ERROR" }` in
production (Vercel + Neon), after the database itself was confirmed healthy
and fully migrated (see `BUG-004`). Reproduced directly against the real
production database from a local script to get the underlying error instead
of the generic wrapped message.

## Root cause

```
PrismaClientKnownRequestError:
Transaction API error: A query cannot be executed on an expired transaction.
The timeout for this transaction was 5000 ms, however 7450 ms passed since
the start of the transaction.
code: 'P2028'
```

`provisionShop()` (shared by public self-registration and admin-created
shops) does its work inside one `prisma.$transaction()`. Buried inside that
transaction, `provisionShopRoles()` looped over the 6 default shop roles and,
**per role**, did:

1. `tx.role.create(...)`
2. `tx.permission.findMany(...)` — re-fetching permissions from scratch for
   every single role, even though the full permission set only has ~34 rows
   total and most roles share several permissions with each other.
3. `tx.rolePermission.createMany(...)` — one batch insert call per role
   instead of one for all of them.

That's 3 round trips × 6 roles = 18, plus ~7 more for the rest of the
transaction (shop create, employee, user, shop update, subscription,
subscription history, audit log) — roughly 25 sequential network round trips
to Postgres inside one transaction. Against a real network-hop database
(Neon, not localhost) this took 7.4 seconds; Prisma's default interactive
transaction timeout is 5 seconds, so the transaction was forcibly killed
partway through.

This never surfaced in local dev because local Postgres round trips are
near-instant (sub-millisecond, same machine) — 25 of them together still
finished well under 5s. It only became visible once running against a real
hosted database with real network latency per query.

## Fix

`backend/src/common/services/provisionShop.ts`:

1. **Fetch every permission the shop's roles could need once, up front**
   (a single `findMany` with all permission names across all 6 roles,
   deduplicated), instead of once per role.
2. **Batch every role→permission link into one `createMany` call** at the
   end of the loop, instead of one `createMany` per role.
3. Added `{ timeout: 10_000 }` to the `$transaction()` call as a safety
   margin on top of the round-trip reduction — the real fix is fewer round
   trips, not a longer clock.

Round trips inside the transaction dropped from ~25 to ~15.

## Verification

Reproduced the bug and confirmed the fix by calling `registerShop()`
directly against the real production Neon database from a local script
(`DATABASE_URL`/`DIRECT_DATABASE_URL` pointed at Neon), not just against
local dev or with mocks:

- **Before the fix:** real `P2028` timeout, 7450ms elapsed.
- **After the fix:** real successful registration — returned a real token,
  user, shop, and trial subscription.

The test shop/user this created in production was deleted afterward via a
manual cleanup transaction (delete order: null out `shops.owner_id` to break
the shop↔owner circular FK, then `audit_logs` → `subscription_history` →
`subscriptions` → `users`/`roles` (cascades to `user_roles`/
`role_permissions`) → `employees` → `shops`).

## Lesson

A transaction that's comfortably fast against localhost Postgres can still
blow through Prisma's default 5s interactive-transaction timeout against a
real hosted database, purely from accumulated per-query network latency —
this is invisible until tested against the actual production database (or
at least some real network-hop database), not local dev. When a transaction
does a variable/large number of operations (looping to provision N of
something), count the round trips, not just "does it work locally."
