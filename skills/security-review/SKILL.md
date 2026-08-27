---
name: security-review
description: Use before merging or shipping any change that touches authentication, permissions, location scoping, or visitor/task PII. Trigger on requests like "review this for security", "is this safe to merge", "check this endpoint's permissions", or proactively whenever a PR touches `api-authentication` or `location-scoping` territory — don't wait to be asked.
---

# Security Review

A checklist to run before merging changes that touch auth, permissions, or
personal data. This app handles visitor PII (names, sometimes ID/photo)
across multiple locations, so scoping and access control failures are the
highest-impact bug class here.

## Step 1: Authentication

- [ ] Every new/changed endpoint has an explicit `permission_classes` — none
      relying on a permissive global default.
- [ ] No credential (token, session id) is logged, or included in an error
      message that could reach client-side logs/analytics.

## Step 2: Authorization

- [ ] Authorization is checked server-side, not inferred from a value the
      client sent (a `location_id`, `role`, or `user_id` in the request
      body/query params).
- [ ] Object-level checks exist even where the queryset is scoped — a
      correctly filtered `list()` doesn't guarantee `retrieve()` rejects a
      guessed ID from another location. See `location-scoping`.

## Step 3: Data exposure

- [ ] Serializers list fields explicitly; no `fields = "__all__"` on a
      model that could grow a sensitive field later without review.
- [ ] Nothing beyond what's needed is included in list endpoints (avoid
      returning a full nested object when an id + display name suffices).
- [ ] Printed documents (`printing-and-documents`) don't include more PII
      than the physical use case requires.

## Step 4: Input handling

- [ ] User input is validated server-side (see `forms-and-validation`),
      not trusted because the frontend form already checks it.
- [ ] File uploads (if any — e.g. visitor photo) are validated by content,
      not just filename/extension, and size-limited.

## Step 5: Dependencies

<!-- TODO: confirm the process, e.g. `pip-audit` / `npm audit` in CI -->
- [ ] No new dependency introduces a known vulnerability at the version
      pinned.

## When something fails this review

Flag it clearly and don't merge around it. If the fix is non-trivial,
prefer holding the PR over shipping a partial mitigation with a "TODO:
fix properly later" — those TODOs are exactly the ones that don't get
revisited.
