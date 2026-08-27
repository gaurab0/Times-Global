---
name: testing-and-debugging
description: Use whenever writing tests or debugging an issue in this codebase — test conventions for backend and frontend, and a structured approach to chasing a bug. Trigger on requests like "write a test for X", "why is this failing", "reproduce this bug", or before opening any PR that lacks test coverage.
---

# Testing and Debugging

## Step 1: Backend tests

<!-- TODO: confirm — pytest-django? Django's own TestCase? -->
1. Test at the API layer (hitting the endpoint) for anything
   permission/scoping-related, not just the serializer/model in isolation
   — see `location-scoping` and `api-authentication` for why the boundary
   matters more than the unit.
2. Cover: happy path, permission-denied path, and at least one invalid-
   input path per endpoint.
3. Use factories/fixtures for test data rather than hand-building objects
   in every test <!-- TODO: confirm factory setup, e.g. factory_boy -->.

## Step 2: Frontend tests

<!-- TODO: confirm — Jest + React Testing Library? -->
1. Test behavior (what the user sees/can do), not implementation detail —
   query by role/text, not by CSS class or internal state.
2. For forms, test that server-side validation errors render against the
   right field, not just that the form submits.

## Step 3: Debugging a reported issue

1. Reproduce first — don't start changing code before you can trigger the
   bug on demand; a "fix" for a bug you can't reproduce is a guess.
2. Narrow the layer: is the wrong data coming back from the API (check
   with the network tab or a direct API call), or is correct data being
   rendered wrong (check the component)? This splits the search space in
   half immediately.
3. Check `location-scoping` first for anything involving "wrong data
   showing up" — cross-location leakage is the most common source of
   "this looks wrong" bugs in this app.
4. Once fixed, write a test that would have caught it, so the bug can't
   silently come back.

## Step 4: Running the suite

<!-- TODO: fill in the actual commands -->
- Backend: `___`
- Frontend: `___`
- Full suite (as CI runs it): `___`

## Common pitfalls

- A test that passes because it's asserting on a mock rather than real
  behavior — double-check what's actually being exercised.
- Fixing the symptom at the layer where it was noticed (e.g. frontend)
  when the actual bug is upstream (e.g. an unscoped queryset).
