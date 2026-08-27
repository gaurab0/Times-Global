---
name: react-typescript
description: Use for any frontend component or feature work in this codebase — building components, typing props, fetching data, or managing state. Trigger on requests like "build a component for X", "add a page for Y", "type this prop", or any change under `times-global_frontend/components/`. Pair with `forms-and-validation` for form-specific work and `api-authentication` for auth-gated UI.
---

# React + TypeScript

Conventions for components, typing, and data fetching in the frontend at
`times-global_frontend/` (React 19 + TypeScript + Vite 6, react-router-dom v7
with a `HashRouter` — see `App.tsx`).

## Step 1: Place the file correctly

The current layout is flat under `components/`, organized by feature:

- `components/common/` — shared primitives (`Button`, `Input`, `Textarea`, `DashboardCard`)
- `components/vms/` — visitor management pages
- `components/forms/` — DeviceStorage/GatePass forms + printable views
- `components/task-management/` — task pages
- `components/auth/` — location selection, pending approval
- `components/LocationContext.tsx` — single auth/location context for the whole app
- `services/apiService.ts`, `services/tokenService.ts` — API client + JWT storage

Don't create new top-level directories. New feature pages go in the matching
feature folder; genuinely reusable pieces go in `components/common/`.

## Step 2: Component conventions

1. Function components with **default exports** are the existing convention in
   this repo (e.g. `components/vms/VMSVisitorListPage.tsx`) — follow it for
   consistency even though named exports would be more refactor-friendly.
2. Props get an explicit `interface <ComponentName>Props`, not inline object
   types, once there are more than one or two props.
3. Do not introduce new `any` types. The codebase already has ~49 (`catch (err: any)`
   everywhere); don't add more. Type caught errors as `unknown` and narrow, or
   use the `ApiError` class from `services/apiService.ts`.
4. Do not add new global type overrides in `index.tsx` — the existing
   `declare module` blocks there effectively disable TS checking for core
   modules. New code should compile cleanly without them.

## Step 3: Data fetching

Use the shared API client in `services/apiService.ts` rather than calling
`fetch` directly in a component — it handles base URL (`VITE_API_BASE_URL`),
JWT attach/refresh-on-401 with a single-flight queue, and automatic injection
of `location_id` into whitelisted GET endpoints.

- It returns `Promise<T | undefined>` (`undefined` on HTTP 204) — callers must
  null-check before `.results` access. The common unwrap is
  `Array.isArray(data) ? data : data?.results ?? []`.
- Every fetch has three states: loading, error, success. Existing pages model
  this as `isLoading` / `error` / success-data triplets.
- Use an `isActive` flag or `AbortController` in effects that fetch, so a
  stale response can't overwrite newer state (the debounced lookup in
  `components/vms/VMSAddRecordPage.tsx` is the in-repo reference pattern).
- Don't read `localStorage` for the selected location inside new code — take
  it from `LocationContext` so there's one source of truth.
- Avoid N+1 request patterns like per-row image lookups
  (`enrichVisitorsWithImages` in `VMSVisitorListPage.tsx` is legacy debt, not
  a pattern to copy).

## Step 4: State

- Local UI state → `useState`.
- Auth/session and selected location → `LocationContext` (`components/LocationContext.tsx`);
  extend it rather than adding a second context or reading storage ad hoc.
- There is no Redux/Zustand/React Query — don't introduce one without asking.
- Server data stays in component state keyed off fetches; re-fetch on filter
  change instead of duplicating server state locally.

## Step 5: Before opening a PR

There is no linter or CI yet, so verify manually:

```powershell
npm run build            # from times-global_frontend/ — vite build catches most issues
npx tsc --noEmit         # type check (note: tsconfig has known issues; fix what you touch)
```

## Common pitfalls

- Fetching in `useEffect` without handling loading/error states — every fetch
  has three states, not one.
- Re-render storms in long list views (visitor list, task board): derive values
  during render or `useMemo` instead of recomputing per keystroke.
- Forgetting that routing uses `HashRouter` — links must work under `#/`, and
  deep-link handling differs from a BrowserRouter setup.
- Duplicating `ApiResponse<T>` / unwrap logic in a new file — reuse or extract
  into `services/` instead; it's already copy-pasted across ~7 components.
