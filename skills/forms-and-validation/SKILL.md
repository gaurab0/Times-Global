---
name: forms-and-validation
description: Use whenever building or editing a form, or defining validation rules — visitor check-in, device storage, gate pass, task forms, or any serializer `validate()`. Trigger on requests like "add a field to this form", "validate this input", "show an error when X", or any change under a form component in `times-global_frontend/components/` or a serializer's validation. Server-side validation is the actual boundary; client-side is UX.
---

# Forms and Validation

Keeping client and server validation consistent across
`times-global_frontend/components/forms/*` (DeviceStorageForm,
GatePassForm) and the DRF serializers in
`django_backend/vms_project/forms_module/serializers.py` (plus the visitor
check-in form in `components/vms/VMSAddRecordPage.tsx`).

## Step 1: Server-side validation is mandatory, client-side is UX

Every validation rule must exist on the backend serializer regardless of
whether it's also enforced in the frontend form — the API can be called from
outside your own UI. Client-side validation exists only to give faster
feedback; treat it as optional polish, never as the actual guarantee.

## Step 2: Define the field-level rules

For each field, decide:

1. Required or optional, and under what conditions (e.g. a field required at
   check-in but not at pre-registration).
2. Format constraints (email, phone, max length).
3. Cross-field rules (e.g. "checkout time must be after check-in time") —
   these belong in the serializer's `validate()`, not `validate_<field>()`.

## Step 3: Frontend form implementation

The existing pattern is custom controlled components (`useState` object of
form fields), **no** react-hook-form/Formik — don't introduce a form library
without asking.

1. Mirror the backend's required/optional and format rules so the user sees
   the same error before submitting that the API would return after.
   Shared primitives live in `components/common/` (`Input`, `Textarea`,
   `Button`) — use them instead of raw elements so styling stays consistent.
2. Surface server-side validation errors (field-keyed dicts from DRF)
   against the corresponding field, not just a generic banner. The backend
   field-error formatting loop exists in both big forms
   (`DeviceStorageForm.tsx`, `GatePassForm.tsx`) — extract it to a shared
   helper rather than copy-pasting it a third time.
3. Disable submit while a request is in flight to prevent duplicate
   submissions, especially for check-in/check-out actions.
4. Long forms (DeviceStorage ~737 lines, GatePass ~714): put new sections in
   their own subcomponent rather than growing the monolith further.

## Step 4: Error message conventions

- Plain language; don't repeat the field label if it's already shown next to
  the field.
- API errors reach components as `ApiError` instances from
  `services/apiService.ts` — read `.message` / `.data`; note that
  `err.detail` does not exist on this class (a recurring dead expression).
- Blocking `alert()` for user-facing outcomes (e.g. checkout results in
  `VMSVisitorListPage.tsx`) is legacy debt — prefer inline banners/toasts for
  new work.

## Common pitfalls

- Rules drifting out of sync between frontend and backend after one side gets
  a "quick fix" — if you change a rule, update both, or move the rule
  server-side only and let the frontend relay the API error.
- Validating format (e.g. email) but not the business rule (e.g. "must belong
  to an existing host") in the same field.
- Submitting without a `location_id`: POST bodies must include it explicitly;
  only whitelisted GETs get it auto-appended by `apiService.ts`.
