---
name: visitor-management
description: Use for any change to the visitor domain — check-in/check-out flow, visitor records, host notification, or badge triggering. Trigger on requests like "add a field to the visitor form", "change the check-in flow", "notify the host when a visitor arrives", or anything under `apps/visitors` / `features/visitors`. Pair with `django-backend`/`django-rest-api` or `react-typescript` depending on the layer, and `location-scoping` since visitors always belong to a site.
---

# Visitor Management

Domain logic for the visitor check-in/check-out lifecycle.

## Step 1: Understand the visitor lifecycle

<!-- TODO: confirm the real state machine -->
```
invited/pre-registered → checked_in → checked_out
                       ↘ walk_in (no pre-registration) ↗
```
Every state transition should be a single, explicit method
(`check_in()`, `check_out()`) rather than a bare field update — this is
where side effects belong (timestamp, notify host, trigger badge print),
so they can't be forgotten at one of the call sites.

## Step 2: Adding or changing a visitor field

1. Add the field to the model (`django-backend`) and serializer
   (`django-rest-api`).
2. Decide if it's collected at pre-registration, at check-in, or both —
   this affects which form it goes on (`forms-and-validation`).
3. Confirm whether the field should appear on the printed badge
   (`printing-and-documents`).

## Step 3: Check-in flow

1. Validate the visitor is expected at *this* location
   (`location-scoping`) — a visitor pre-registered at one site shouldn't be
   checkable-in at another.
2. Record `checked_in_at` and the staff member who processed it, if
   applicable.
3. Trigger host notification <!-- TODO: confirm channel — email? SMS?
     in-app? -->.
4. Trigger badge generation if the flow requires a printed badge — see
   `printing-and-documents`.

## Step 4: Check-out flow

1. Only allow check-out from `checked_in` state; reject (with a clear
   error) attempts to check out a visitor who never checked in or already
   checked out, rather than silently no-op'ing.
2. Record `checked_out_at`.

## Common pitfalls

- Allowing check-in without a location check, which lets staff at one site
  check in a visitor registered elsewhere.
- Treating "walk-in" (no pre-registration) as an error case instead of a
  supported path with its own validation rules.
