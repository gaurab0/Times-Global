---
name: location-scoping
description: Use whenever data access depends on which site/location a user belongs to — visitor records, tasks, device storage, gate passes, images. Trigger on requests like "scope this endpoint", "user can't see X's data", "add a new location-scoped model/endpoint", or any queryset that filters by `location`.
---

# Location Scoping

The core authorization pattern of this codebase: every operational record
belongs to a `locations.Location`, and users only see records for locations
they're authorized for.

## The data model

- `locations.Location` — `name` (unique), `description`.
- `users.User.authorized_locations` (M2M → `Location`, related_name
  `authorized_users`) — the server-side source of truth for what a user may
  access. Never trust a client-sent location list; the frontend copy in
  `localStorage` / `LocationContext` is UX only.
- Scoped models carry `location = ForeignKey(Location, on_delete=PROTECT,
  related_name=...)`: `Visitor`, `DeviceStorageEntry`, `GatePass`, `Task`.

## Step 1: Backend enforcement

The canonical implementation is `BaseLocationScopedViewSet`
(`django_backend/vms_project/forms_module/views.py`). For any new
location-scoped viewset:

1. Subclass `BaseLocationScopedViewSet`. Its `get_queryset()`:
   - returns `.none()` if the user isn't `is_approved_by_admin`;
   - returns `.none()` if the user has no authorized locations;
   - otherwise filters to `user.authorized_locations`.
   Because DRF's `get_object()` uses `get_queryset()`, this also protects
   retrieve/update/delete — do not bypass it with a custom queryset.
2. Writes: pass the payload's `location_id` through `perform_create`, which
   validates it against `user.authorized_locations` before saving. Don't
   re-implement this check inline.
3. Do **not** copy the ad-hoc scoping in
   `task_management/views.py:80-107` (`completed_today_count`) — it
   reimplements the same rules manually. If the base class doesn't fit an
   action, extend the base class or extract a shared helper instead of
   duplicating logic.

## Step 2: Frontend contract

- GETs: `services/apiService.ts` automatically appends `?location_id=` from
  the selected location for whitelisted endpoints
  (`endpointsRequiringLocationForGET`). Add your endpoint to that list if its
  list action needs scoping.
- POSTs/PATCHes: the body must include `location_id` explicitly (see
  `components/vms/VMSAddRecordPage.tsx` for the pattern).
- Selected location lives in `components/LocationContext.tsx`; switching it
  should trigger refetch of all location-scoped views.

## Known gaps (treat as bugs, not patterns)

- `images.StoredImageViewSet` has no location FK and no permission classes —
  any authenticated user can read every image globally.
- `locations.LocationViewSet` is `IsAdminUser` for everything including list,
  so approved non-admin users can't fetch locations directly; they receive
  them via the login response / JWT claims. If you need a user-facing
  locations endpoint, add a read-only, member-scoped one rather than opening
  up the admin viewset.

## Common pitfalls

- A missed scope filter in `get_queryset()` is a **data-leak bug**, not just a
  bug. When adding an endpoint, verify the unapproved-user and wrong-location
  cases return empty, not full data.
- Filtering by `location_id` from query params without checking membership —
  always intersect with `authorized_locations`.
- Forgetting `related_name` on a new FK to `Location` (reverse-accessor
  collisions once two models reference it).
