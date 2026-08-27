---
name: api-authentication
description: Use for anything involving login, sessions/tokens, or permission checks — backend permission classes, frontend auth guards, or "why am I getting a 401/403". Trigger on requests like "protect this endpoint", "add a login flow", "check if the user can access X", or any change touching auth. Pair with `location-scoping` whenever access depends on a location.
---

# API Authentication

How auth is enforced in `django_backend/vms_project/` and consumed in
`times-global_frontend/`.

## Mechanism (as built)

- **Scheme**: JWT via `djangorestframework-simplejwt`. Access + refresh tokens
  issued by `CustomTokenObtainPairView` at `POST /api/auth/login/`
  (`users/views.py`, `users/serializers.py`). Refresh at `/api/auth/token/refresh/`.
- **Frontend storage**: both tokens live in `localStorage` under `authToken` /
  `refreshToken` (`services/tokenService.ts`), set by
  `components/LoginPage.tsx`. This is XSS-exposed by design — known trade-off;
  do not move to cookies without coordinating backend CORS changes.
- **Global defaults** (`vms_project/settings.py`):
  `rest_framework_simplejwt.authentication.JWTAuthentication` +
  `IsAuthenticated`, DRF pagination page size 10.

## Step 1: Backend — protecting an endpoint

1. Set `permission_classes` on every view(viewset) explicitly. The global
   default is only a safety net; several viewsets currently rely on it (e.g.
   `images/views.py`) and that's debt, not convention.
2. The only intentionally-public endpoint is user self-registration:
   `UserRegistrationView` with `AllowAny` (`users/views.py:14`). New users are
   created with `is_approved_by_admin=False` and must not be treated as active
   anywhere else.
3. If access depends on the user's location, use the scoping pattern in
   `location-scoping` (`BaseLocationScopedViewSet` in
   `forms_module/views.py`). Authentication alone is never sufficient for
   location data.
4. Object-level safety comes from queryset scoping: because `get_object()`
   uses `get_queryset()` (DRF default), filtering the queryset also protects
   retrieve/update/delete. Keep it that way when adding actions.

## Step 2: Frontend — gating a route or action

1. Check auth state via `LocationContext` (`components/LocationContext.tsx`),
  never by reading `localStorage` directly in a page component.
2. Route guards live at the router level in `App.tsx` (`ProtectedRoute`,
   `AuthRoute`, plus inline conditions for `/pending-approval`,
   `/no-locations-assigned`, `/select-location`). Gate new routes there.
3. Hiding a button doesn't make an action secure — the backend permission
   check is the actual boundary; the frontend check is UX only.
4. On refresh-token failure, `apiService.ts` dispatches an `auth-failure`
   CustomEvent that redirects to `#/login`. Reuse that flow for any new
   global logout handling instead of clearing storage piecemeal.

## Step 3: Approval flow

Registration → login allowed but flagged unapproved → redirected to
`PendingApprovalPage` → admin sets `is_approved_by_admin` (Django admin).
Backend enforcement of approval happens inside `BaseLocationScopedViewSet`
(queryset returns `.none()` for unapproved users). Any new domain must go
through the same check, not trust client-sent flags.

## Step 4: Test both sides

There is no test suite yet (no `tests.py` exists). When adding one for your
change, cover at minimum:

- Backend: endpoint hit unauthenticated (expect 401), as an approved user
  outside the target location (expect empty result / 403), plus happy path.
- Frontend: gated route doesn't render for logged-out / unapproved users.

## Common pitfalls

- Checking authentication (`is_logged_in`) when the endpoint actually needs
  authorization (`is_logged_in AND location authorized`) — pair with
  `location-scoping`.
- Trusting a location or role value sent from the client. Note
  `authorizedLocations` is persisted in `localStorage` and is cosmetic;
  server-side scoping re-derives from `User.authorized_locations`.
- Adding fields to the JWT claim payload (`users/serializers.py`) — the token
  embeds `authorized_locations_preview`; more claims bloat tokens and go stale
  until refresh.
