---
name: project-architecture
description: Use this skill to orient in the codebase before starting any non-trivial task — understanding the API surface, the auth/onboarding flow, the request lifecycle, and which of the other skills (django-backend, django-rest-api, react-typescript, api-authentication, location-scoping, visitor-management, task-management, forms-and-validation, printing-and-documents, testing-and-debugging, security-review, deployment) applies. Trigger this for onboarding questions, "how is this app structured", "where should this code live", "what's the tech stack", or any time it's unclear which specialized skill to consult. This is the map, not the destination — for work fully scoped to one domain, go straight to the relevant skill instead.
---

# Project Architecture

A visitor and task management system with location-based access control:
users register, get approved, get assigned to one or more locations, and
then work within a location-scoped dashboard covering visitors and tasks.

## Tech stack

- **Backend:** Django + Django REST Framework
- **Frontend:** React + TypeScript, API calls centralized through
  `apiService.ts`
- **Auth:** JWT
- **Database:** SQLite / PostgreSQL <!-- TODO: confirm which is used where
  — commonly SQLite for local dev, PostgreSQL in staging/production -->
- **Media storage:** served from `/media/` <!-- TODO: confirm production
  serving — local disk via Django/nginx, or offloaded to S3/a CDN -->
- **Hosting / CI:** <!-- TODO: fill in -->

## API surface (URL routing)

| Path | App | Notes |
|---|---|---|
| `/api/auth/` | `users` | Registration, login, JWT issuance |
| `/api/locations/` | `locations` | Location list/assignment |
| `/api/visitors/` | `visitors` | Visitor check-in/out |
| `/api/` | `forms_module` | Mounted at the API root itself |
| `/api/images/` | `images` | Image upload/retrieval |
| `/api/task-management/` | `task_management` | Task assignment/tracking |
| `/admin/` | Django Admin | Staff-only |
| `/media/` | — | Uploaded files |

**Watch out:** `forms_module` is mounted at `/api/` rather than a scoped
prefix like `/api/forms/`. That means every other app's routes are
effectively siblings of `forms_module`'s own routes under the same root —
when adding a new top-level route anywhere in the project, check
`forms_module`'s urls.py for a collision before assuming the path is free.
If this was intentional (e.g. `forms_module` needs the bare root for
backward-compatible links), leave a comment there saying so; if not, it's
worth moving to its own prefix while the API surface is still small.

## Directory structure

<!-- TODO: confirm exact layout, but apps map 1:1 to the routing table above -->
```
backend/
  config/                 # settings, root urls.py
  apps/
    users/                # auth, registration, approval status
    locations/            # sites, location assignment
    visitors/             # visitor check-in/out domain
    forms_module/          # forms, mounted at /api/ root
    images/                 # image upload/retrieval
    task_management/          # task domain
  manage.py

frontend/
  src/
    api/
      apiService.ts        # single point of HTTP + JWT handling
    features/
      auth/
      locations/
      visitors/
      tasks/
```

## Auth and onboarding flow

Every session goes through this sequence before reaching the dashboard —
each step is a gate, not just a UI screen, and each one should be enforced
server-side, not only skipped-past in the frontend:

1. **Login / Register** — `/api/auth/`.
2. **JWT Authentication** — token issued on success; attached to all
   subsequent requests via `apiService.ts`.
3. **Approval Check** — a valid JWT alone isn't enough to use the app; the
   user account must also be approved. <!-- TODO: confirm the mechanism —
   an `is_approved` flag set by an admin via `/admin/`, or a dedicated
   approval endpoint. -->  Any endpoint beyond auth should reject an
   authenticated-but-unapproved user, not just hide UI for them — see
   `api-authentication`.
4. **Location Assignment Check** — the user must have at least one
   location assigned. <!-- TODO: confirm what an unassigned user sees —
   blocked entirely, or a "contact your admin" state. -->
5. **Location Selection** — if the user has more than one assigned
   location, they pick one for the session. This selected location becomes
   the scope for every subsequent request — see `location-scoping` for how
   that scope must be enforced server-side, not trusted from the client.
6. **Dashboard** — landing point once approval + location are resolved.
7. Branches into **Visitor Management** and **Task Management**.
8. Visitor Management further branches into **Forms, Lists, Reports,
   Images, Documents**.

## Request lifecycle

```
React Component
      |
      v
apiService.ts              (attaches JWT, sets base URL, central error handling)
      |
      v
HTTP Request with JWT
      |
      v
Django URL Router          (routes above)
      |
      v
Application View
      |
      v
Serializer Validation       (the actual data-integrity boundary — see forms-and-validation)
      |
      v
Django Model
      |
      v
SQLite / PostgreSQL Database
```

Two things worth internalizing about this shape:

- **`apiService.ts` is the only place that should touch JWT/headers/base
  URL.** A component calling `fetch` directly bypasses whatever
  `apiService.ts` centralizes (auth header, 401/token-refresh handling,
  error shape) — see `react-typescript`.
- **Serializer validation is the real boundary, not the frontend form.**
  Anything reachable via this router can be hit without going through your
  UI at all, so validation and permission/approval/location checks that
  only exist in a React component don't actually protect anything — see
  `forms-and-validation` and `security-review`.

## How the other skills map to this codebase

| Skill | Covers | Consult when |
|---|---|---|
| `django-backend` | App structure, models, migrations, admin config | Any change touching `apps/*` |
| `django-rest-api` | Serializers, viewsets, routers, pagination | Adding or changing an endpoint |
| `react-typescript` | Component patterns, hooks, `apiService.ts` usage | Any frontend component/feature work |
| `api-authentication` | JWT flow, approval check, permission classes | Login, approval, session, permission-related work |
| `location-scoping` | Location assignment/selection, per-location data scoping | Anything that must be filtered/scoped per location |
| `visitor-management` | `visitors` app: check-in/out domain logic | Visitor flows |
| `task-management` | `task_management` app: assignment/tracking | Task flows |
| `forms-and-validation` | `forms_module`: form schema + client/server validation | Any form-related feature |
| `printing-and-documents` | `images` app and document/report generation | Generating or printing documents/images |
| `testing-and-debugging` | Test conventions, debugging workflow | Writing tests, chasing a bug |
| `security-review` | Pre-merge checklist | Auth, approval, permissions, or PII touched; before opening a PR |
| `deployment` | Deploy process, environments, CI/CD | Shipping to staging/production |

## Step-by-step: deciding which skill(s) to use

1. **Identify the layer.** Backend, frontend, or full-stack?
2. **Identify the domain.** Visitors, tasks, forms, images, locations, or
   pure auth/onboarding?
3. **Cross-reference the table above** and pull in the layer skill plus the
   domain skill together — most real tasks need both.
4. **Check for cross-cutting concerns.** Anything touching approval status,
   JWT handling, or permissions → also read `api-authentication`. Anything
   filtering or storing data by location → also read `location-scoping`.
5. **Before opening a PR or deploying**, confirm `testing-and-debugging`
   coverage exists and check `deployment` for the release process.

## Conventions

<!-- TODO: fill in with your team's actual conventions -->
- Branch naming: `type/short-description`
- Commit style: <!-- e.g. Conventional Commits -->
- Python style: <!-- black/ruff config? -->
- TypeScript style: <!-- eslint/prettier config? -->

## When *not* to use this skill

If the task is already fully scoped to one domain and layer — e.g. "add a
`phone_number` field to the visitor serializer" — skip straight to the
relevant skill (`django-rest-api` + `visitor-management`) instead of
reading this one first. This skill exists for orientation, not
implementation detail.
