---
name: django-rest-api
description: Use whenever adding or changing an API endpoint — serializers, viewsets, routers, permissions, or pagination. Trigger on requests like "add an endpoint for X", "expose this field in the API", "why is this API returning 403/404", or any change under `django_backend/vms_project/<app>/serializers.py` or `views.py`. Pair with `django-backend` for the model and `location-scoping` / `api-authentication` for access control.
---

# Django REST API

Conventions for building API endpoints with DRF in
`django_backend/vms_project/`.

## URL layout (as built)

All endpoints are unversioned under `/api/`, wired from `vms_project/urls.py`
via per-app `DefaultRouter`s:

| Prefix | App | Notes |
|---|---|---|
| `/api/auth/register/`, `login/`, `token/refresh/`, `me/` | users | login returns access+refresh with location claims |
| `/api/locations/` | locations | admin-only viewset |
| `/api/visitors/` | visitors | router registered on empty prefix |
| `/api/device-storage/`, `/api/gate-passes/` | forms_module | |
| `/api/images/` | images | router on empty prefix |
| `/api/task-management/tasks/` | task_management | |

New viewsets: register on the app's existing router; keep kebab-case prefixes
(`gate-passes`). Don't introduce versioning ad hoc.

## Step 1: Define or update the serializer

In `<app>/serializers.py`:

1. List fields explicitly (`fields = [...]`) rather than `"__all__"` —
   explicit lists prevent accidentally exposing a new model field.
2. Mark computed/read-only fields `read_only=True`. The write-only
   `location_id = SerializerMethodField`-style shadowing pattern is used
   across serializers (visitors, forms_module, task_management) — follow it
   so the frontend contract stays uniform.
3. Cross-field validation goes in `validate()`, single-field in
   `validate_<field>()`. See `forms-and-validation`.
4. Don't expose PII casually: `created_by_email` and full visitor contact
   details are currently serialized to every approved user of a location —
   when adding fields, prefer id + display name.

## Step 2: Define or update the viewset

1. Subclass the appropriate DRF generic (`ModelViewSet`, etc.) — don't write
   raw `APIView` unless the endpoint doesn't map cleanly to CRUD.
2. Set `permission_classes` explicitly — never rely on the global default for
   anything touching visitor/task/image data.
3. If the queryset must be scoped to a location, subclass
   `BaseLocationScopedViewSet` (`forms_module/views.py`) and filter in its
   `get_queryset()` — see `location-scoping`. A missed scope filter here is a
   data-leak bug, not just a bug.
4. Add `select_related('location')` (and `prefetch_related` where relevant) to
   list querysets — list serializers nest a `LocationSerializer`, so omitting
   it causes an N+1 query per row (existing debt in visitors, forms_module,
   task_management).

## Step 3: Response and error conventions

- Pagination: global `PageNumberPagination`, page size **10**. List responses
  are `{ count, next, previous, results }`. The frontend unwraps `.results`
  (see `react-typescript` Step 3). Keep any client-side page-size assumptions
  in sync deliberately, not by coincidence.
- Error shape: `{"detail": "..."}` for single errors, field-keyed dict for
  validation errors (DRF default).
- Dates: ISO 8601. Beware naive-vs-UTC mismatches between frontend date-range
  filters and `checkInTime`-style fields (known bug class in
  `VMSVisitorListPage.tsx`).

## Step 4: Test the endpoint

No test suite exists yet. Add `<app>/tests.py` covering: success case,
unauthenticated (401), permission-denied case, and the location-scoping
boundary (approved user of another location sees nothing). Run
`python manage.py test <app>`.

## Common pitfalls

- Returning a related object's full serialization when an id + name would do —
  watch for N+1 queries.
- Forgetting `select_related`/`prefetch_related` on list endpoints.
- Hand-writing `update()` bodies that copy each field, or delete-and-recreate
  nested items outside `transaction.atomic` (current anti-patterns in
  `forms_module/serializers.py`) — let ModelSerializer handle flat updates
  and wrap nested writes in a transaction.
