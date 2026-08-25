---
name: security-review
description: Use before merging any change that touches auth, permissions, location scoping, PII, file uploads, or outbound communications (email/SMTP). Trigger on requests like "review this before merge", "is this safe to ship", or as the mandatory pairing step for auth changes per `api-authentication`. Walks the checklist below; anything marked must be verified against real code, not assumed.
---

# Security Review

A pre-merge checklist. Each item exists because the failure mode has either
already happened in this codebase or is one missed filter away.

## Step 1: Access control

- [ ] Every new endpoint sets `permission_classes` explicitly — no reliance on
      the global default.
- [ ] Location-scoped data goes through `BaseLocationScopedViewSet` (see
      `location-scoping`); a queryset missing the scope filter is a data-leak
      bug, not a bug.
- [ ] Unapproved users (`is_approved_by_admin=False`) get empty results, not
      errors that leak record existence.
- [ ] The frontend guard is UX only — confirm the API rejects the action with
      the frontend bypassed entirely.

## Step 2: Secrets and configuration

- [ ] No new credentials hardcoded; env vars only (`settings.py` still has
      insecure fallbacks for `SECRET_KEY`/DB password — don't add more).
- [ ] SMTP credentials (`GATEPASS_EMAIL_*`, `GATEPASS_MANAGER_EMAIL`) come
      from environment variables and are never logged.
- [ ] `DEBUG`, CORS, and `ALLOWED_HOSTS` changes are deliberate, not copied
      defaults (`CORS_ALLOW_ALL_ORIGINS=True` + credentials is known debt).

## Step 3: Data exposure

- [ ] New serializer fields reviewed for PII (visitor contacts, staff emails,
      ID document images are all sensitive; several existing serializers
      over-expose them).
- [ ] Outbound email recipients checked: gate pass device details go only to
      the dedicated management inbox (`GATEPASS_MANAGER_EMAIL`), never to
      visitor or staff personal addresses — both the device inventory and the
      manager's dedicated inbox deserve a second look before merging, since a
      wrong recipient turns an operational log into an information leak.
- [ ] Error responses don't echo stack traces, internal IPs, or credentials.
- [ ] Uploaded files (images app) validated by content type and size; upload
      endpoints can't be used as free storage by any authenticated user.

## Step 4: Failure behavior

- [ ] Side effects (emails, notifications) cannot undo or block the primary
      operation — wrapped in try/except, failures logged, never re-raised.
- [ ] Nested writes run inside `transaction.atomic`.
- [ ] Background-task migration considered if synchronous side effects slow
      the request path.

## Step 5: Tests prove it

- [ ] Unauthenticated → 401; unauthorized/out-of-location → empty or 403.
- [ ] Email-sending code tested with locmem backend against
      `django.core.mail.outbox` — never real SMTP.
