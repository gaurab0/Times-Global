---
name: visitor-management
description: Use whenever creating or changing visitor flows — check-in/check-out, pre-registration lookup, visit history, or the device gate pass flow including its email side effect. Trigger on requests like "change the check-in form", "fix checkout", "gate pass emails stopped", or any change under `django_backend/vms_project/visitors/`, the visitor pages in `times-global_frontend/components/vms/`, or gate-pass code in `forms_module`. Pair with `location-scoping` for access control and `forms-and-validation` for input rules.
---

# Visitor Management

The visitor domain: pre-registered visitor profiles live in `images`
(`StoredImage`, global, searched by exact fullName on the frontend); visit
records live in `visitors` (`Visitor`, location-scoped); gate passes for
devices leaving a site live in `forms_module` (`GatePass` + items).

## Step 1: Check-in / Add record

1. New visits are created via `POST /api/visitors/` from
   `components/vms/VMSAddRecordPage.tsx`; the body must include
   `location_id` (see `location-scoping`).
2. Auto-fill from registered visitors happens ONLY when the user clicks a
   suggestion or the blurred text exactly matches a registered fullName
   (case-insensitive). Never auto-fill from partial input — see
   `handleFullNameBlur` in `VMSAddRecordPage.tsx`; fuzzy first-match fill was
   a real bug once.
3. The list/report views paginate server-side (`?page=`, size 10) and enrich
   rows with images only through `services/visitorImageService.ts` — never
   per-row inline requests.

## Step 2: Check-out

1. Check-out goes through the custom `checkout` action on `VisitorViewSet`
   (`POST /visitors/{id}/checkout/`). It sets `checkOutTime`; keep treating
   it as the single source of truth rather than patching arbitrary fields.
2. The frontend applies the returned `checkOutTime` optimistically to both
   the Today panel and report output; don't add extra refetches per checkout.

## Step 3: Gate pass issuance

1. Gate passes are created via `POST /api/gate-passes/`
   (`GatePassViewSet` → `GatePassSerializer.create()` in `forms_module`).
   Items are nested-written; wrap nested writes in `transaction.atomic`.
2. Issuing a gate pass has an email side effect — see Step 4.

## Step 4: Gate pass email notification

Whenever a gate pass is issued for a device, a copy of the device details is
emailed via SMTP to a dedicated gate-pass management inbox owned by the
manager — never to the visitor's or staff member's personal email, because
the management address is an operational record destination, not a
correspondence one.

1. Send from the serializer's `create()`, immediately **after** the gate pass
   row is saved — not from the frontend, and not from a signal. A signal can
   fire more than once (e.g. re-saves, migrations backfills), which would
   duplicate notifications; `create()` fires exactly once per issued pass.
2. SMTP credentials come exclusively from environment variables:
   `GATEPASS_EMAIL_HOST`, `GATEPASS_EMAIL_USER`, `GATEPASS_EMAIL_PASSWORD`,
   `GATEPASS_MANAGER_EMAIL`. Never hardcode them and never log them — the
   password in a log line is a leaked credential.
   <!-- TODO: confirm SMTP provider/host and port -->
3. Email failure must never undo or block a successfully issued gate pass.
   Wrap the send in try/except, log the failure, and do NOT re-raise — the
   visitor has already left the building with the device; losing the email is
   recoverable, failing the issuance API call is not.
4. Sending synchronously inside `create()` blocks the HTTP response for the
   duration of the SMTP round-trip. If issuance volume ever makes the UI
   noticeably slow, move sending to a background task (Celery/Django-RQ);
   <!-- TODO: decide sync vs background task based on real volume -->
5. Tests switch `EMAIL_BACKEND` to `django.core.mail.backends.locmem.EmailBackend`
   and assert against `django.core.mail.outbox` — tests never send real email.
   Cover: mail sent on success, recipient correctness, and gate pass still
   created when the send raises.
   <!-- TODO: confirm whether the printable PDF/badge should be attached to
        the email or if body-text device details are sufficient -->
