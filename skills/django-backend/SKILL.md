---
name: django-backend
description: Use whenever creating or modifying a Django app, model, migration, or admin config in this codebase. Trigger on requests like "add a model for X", "create a migration", "register this in the admin", "what Django app should this go in", or any backend change under `django_backend/vms_project/`. For request/response shape and endpoints specifically, pair with `django-rest-api`.
---

# Django Backend

Conventions for structuring Django apps, models, and migrations. The project
lives at `django_backend/vms_project/` (Django 4.2, DRF, SimpleJWT,
django-cors-headers, django-filter; SQLite by default with optional Postgres
via env vars — see `vms_project/settings.py`).

## Step 1: Decide which app the change belongs to

The real app list (one app per domain):

- `users` — custom `User` (`AUTH_USER_MODEL = 'users.User'`: unique email,
  `is_approved_by_admin`, M2M `authorized_locations`) + auth endpoints under `/api/auth/`
- `locations` — `Location`
- `visitors` — visitor domain (`/api/visitors/`)
- `forms_module` — DeviceStorage + GatePass forms (`/api/device-storage/`,
  `/api/gate-passes/`). Also currently hosts `BaseLocationScopedViewSet` —
  import it for scoped viewsets; don't add unrelated models here.
- `images` — `StoredImage` uploads (`/api/images/`)
- `task_management` — `Task` with per-location sequential `job_id` (`/api/task-management/tasks/`)

If the change doesn't fit an existing app, propose a new one rather than
bolting it onto the closest match.

## Step 2: Adding or changing a model

1. Add the field/model to `<app>/models.py`.
2. Location-scoped records: include
   `location = ForeignKey(Location, on_delete=PROTECT, related_name='<plural>')`
   and follow the scoping rules in `location-scoping`.
3. Existing conventions to follow (or improve deliberately):
   - Visitor/task models use camelCase field names matching the API contract;
     new apps should prefer snake_case model fields + a serializer that maps
     to the camelCase JSON keys.
   - Creators are stored denormalized as `created_by_name` / `created_by_email`
     CharFields (no User FK). If you need real creator relations, propose the
     FK migration explicitly — don't mix both approaches silently.
4. Run `python manage.py makemigrations <app>` and read the generated
   migration before committing; auto-generated migrations sometimes do more
   (or less) than intended around defaults and nullability.
5. Run `python manage.py migrate` locally and confirm it applies cleanly.
   Local run helper: `start_backend.ps1` (also wired into the frontend's
   `npm run dev`).

## Step 3: Admin registration

Register new models in `<app>/admin.py` so staff can inspect/edit data
without the custom UI — this is how user approval
(`is_approved_by_admin`) is administered today. Exclude anything that
shouldn't be admin-editable (e.g. token-bearing models) from the admin.

## Step 4: Write a backend test

There is no test suite yet (no `tests.py` exists anywhere). When you touch a
model or view, create `<app>/tests.py` and cover at least the happy path plus
the authorization boundary (unauthenticated → 401, wrong location → empty).
Run with `python manage.py test <app>`.

## Migration conventions

- Never edit an already-applied migration; write a new one instead.
- Non-nullable new fields need a default or a two-step migration (add nullable
  → backfill → enforce), or the migrate will fail on existing rows.

## Common pitfalls

- Forgetting `related_name` on foreign keys — causes reverse-accessor
  collisions once a model is referenced from two places.
- Adding a non-nullable field without a default.
- Editing `settings.py` secrets: `SECRET_KEY`, `DEBUG`, DB credentials come
  from env vars but currently have insecure hardcoded fallbacks. Don't rely
  on the fallbacks; don't commit real credentials.
