# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Yacd ("Yet Another Clash Dashboard") is a web UI for the Clash/Meta proxy backend's HTTP/WebSocket
control API (`external-controller`). It's a Vite + React 19 + TypeScript SPA with no backend of its
own — it only talks to a Clash-compatible API server.

## Commands

```sh
bun install      # install deps (bun is required, see packageManager in package.json)
bun start        # dev server at http://127.0.0.1:3000 (alias: bun dev)
bun run build    # production build, output goes to ./public (not ./dist, see vite.config.mts)
bun serve        # preview a production build
bun lint         # oxlint src (bun lint:fix to autofix)
bun format       # prettier --write (bun format:check to verify)
bun typecheck    # tsc --noEmit
```

Use `bun run build` rather than `bun build` — the latter is Bun's own bundler command, not the
`build` script.

There is no test suite in this repo (no test runner configured, no `*.test.*` files) — do not add
a `test` script or assume one exists. `bun test` would run Bun's built-in test runner, which this
repo does not use.

`bun run build` writes to `public/` intentionally (not the Vite default `dist/`) so it can be served
directly as static assets/gh-pages; don't "fix" this.

### Linting: oxlint, not ESLint — don't try to bring ESLint back

This repo is on TypeScript 7, which is the Go rewrite: the `typescript` package no longer ships the
old JS compiler API (only `./unstable/*`). typescript-eslint is built entirely on that old API and
every published version — including canary — still declares `peerDependencies.typescript
">=4.8.4 <6.1.0"`, so ESLint simply cannot parse this codebase. Installing `eslint` +
`typescript-eslint` again will fail at startup with `Cannot read properties of undefined (reading
'Cjs')`.

`.oxlintrc.json` mirrors the old `eslint.config.mjs` rule-for-rule. Two deltas worth knowing:

- oxlint has no `import/order`. Import grouping/ordering moved into Prettier via
  `@ianvs/prettier-plugin-sort-imports` (`importOrder` in `.prettierrc`) — it is a *formatting*
  concern now, fixed by `bun format`, not reported by `bun lint`.
- oxlint enables `jsx-a11y/prefer-tag-over-role` and `jsx-a11y/control-has-associated-label` by
  default; both were off/absent in eslint-plugin-jsx-a11y's `recommended`, so `.oxlintrc.json`
  turns them off to keep parity. oxlint is also stricter than ESLint about `role={cond ? … : …}`
  expressions under `no-static-element-interactions`; those sites carry
  `// oxlint-disable-next-line`. oxlint honours `eslint-disable*` comments too, but new
  suppressions should use the `oxlint-` prefix.

Dependency pins that used to live in `pnpm-workspace.yaml` now live in `package.json`:
`overrides` (replaces pnpm `overrides`) and `trustedDependencies` (replaces pnpm `allowBuilds` —
only listed packages may run install scripts, so `core-js` and `@parcel/watcher` stay blocked).

## Architecture

### Talking to the Clash API

The backend is mihomo (Clash.Meta). Its `external-controller` REST/WebSocket API — the contract
`src/api/*` targets — is documented at https://wiki.metacubex.one/api/ (endpoint categories: logs,
traffic/memory, version/cache, configs, upgrades, proxy groups, proxies + latency test, providers +
healthcheck, rules, connections, DNS query, KV storage, debug/pprof). Consult it when adding or
changing an endpoint wrapper.

- `src/api/*.ts` are thin fetch wrappers, one file per Clash API resource (`proxies.ts`, `rules.ts`,
  `configs.ts`, `connections.ts`, `traffic.ts`, `memory.ts`, `rule-provider.ts`, `version.ts`).
- `src/misc/request-helper.ts` builds the request `url`/`init` (auth header) or WebSocket URL from a
  `ClashAPIConfig` (`{ baseURL, secret }`, defined in `src/types.ts`). Always go through
  `getURLAndInit` / `buildWebSocketURL` rather than constructing headers/URLs by hand.
- Multiple backend configs (multiple Clash instances) can be stored at once; the active one is
  `s.app.clashAPIConfigs[s.app.selectedClashAPIConfigIndex]`. CRUD for these lives in
  `src/store/app.ts` (`addClashAPIConfig`, `removeClashAPIConfig`, `selectClashAPIConfig`,
  `getClashAPIConfig`). Switching configs reloads the page rather than trying to reconcile state
  live — keep that behavior when touching this code.

### State management — two systems coexist, don't mix them up

1. **Custom Redux-like store** (`src/store/StateProvider.tsx` + `src/store/*`): a hand-rolled
   context/reducer store using `immer.produce` for updates, not Redux. Actions are plain functions
   dispatched via `dispatch(actionCreator(...))`; an action creator can itself be a thunk
   `(dispatch, getState) => {...}` for async/side-effecting work (see `src/store/app.ts`).
   Components read state via `connect(mapStateToProps)` (see `src/store/index.ts` for the root
   `initialState`/`actions` shape). What is left in it is `app` (API config, theme, UI prefs —
   persisted to localStorage via `src/misc/storage.ts`), `modals` and `configs`.
2. **jotai atoms + TanStack Query**: every feature's server data (`proxies`, `rules`,
   `connections`, `logs`) goes through `useQuery`/`useSuspenseQuery` + `useMutation` in
   `src/modules/<feature>/hooks.ts`, with jotai atoms in `src/store/<feature>.ts` for the small
   pieces of client state that sit alongside it (search text, in-flight latency results). This is
   the only direction new code goes; don't add a slice to the legacy store.

`src/modules/proxies/hooks.ts` is the fullest worked example of pattern 2 — optimistic update with
rollback, mutations that `invalidateQueries`, and a query whose `staleTime` replaces a hand-rolled
window-focus refetch guard.

### Layered layout — top-level dirs are layers, feature names repeat across them

The first level under `src/` is a *layer*; the level below it is a *feature slice*. The same feature
name therefore appears once per layer, which is the intended shape and not duplication. One feature
end to end (`proxies`):

    app/router.tsx -> pages/ProxiesPage.tsx -> components/proxies/*
      -> modules/proxies/{hooks,utils}.ts -> store/proxies.ts (jotai atoms) -> api/proxies.ts

- `src/api/<resource>.ts` — thin fetch wrappers. No React, no state.
- `src/store/*` — legacy global store slices plus `StateProvider.tsx`, and the jotai atoms that
  replaced the migrated slices (see *State management*).
- `src/modules/<feature>/hooks.ts` — the feature's logic as hooks: fetching, filtering/sorting,
  derived state.
- `src/modules/<feature>/utils.ts` — pure helpers, no React import.
- `src/components/<feature>/*.tsx` — rendering only: props in, DOM out.
- `src/components/shared/*` — presentational pieces used by more than one feature.
- `src/app/*` — the application shell: router, providers, bootstrap, `SideBar`, `ErrorBoundary`.
- `src/hooks/*` — hooks used by more than one feature (`useVersion`). A hook with a single consumer
  belongs in that feature's `modules/<feature>/hooks.ts` instead.
- `src/pages/<Feature>Page.tsx` — **not a page**. It is the `connect(mapStateToProps)` adapter that
  binds the legacy store to a component, which is why most of them are ~10 lines
  (`pages/RulesPage.tsx` is the canonical shape). Keeping `connect` here is what lets the component
  under `components/<feature>/` stay prop-driven and store-agnostic. `pages/ProxiesPage.tsx` is
  longer only because it uses `createSelector` to collapse ten `app` prefs into one memoized
  `appConfig`; without that, `connect`'s shallow compare re-renders the whole page on every change.

Dependencies run one way: `app → pages → components → modules → store → api`. Two rules follow from
that, both of which had been violated before, so check them when adding code:

- a component must not import from `src/api/*` except with `import type` — put the call in the
  feature's `hooks.ts` (`useCloseConnections` in `src/modules/connections/hooks.ts` is the pattern);
- a module must not import a component.

`src/components/` itself holds only directories; don't add loose `.tsx` files back to it.

### Surfacing errors to the user

`src/store/toast.ts` exposes `toast(kind, message)` and writes to jotai's default store, so it works
outside React and store thunks can call it directly. mihomo answers failures with
`{ "message": "..." }` — parse it with `readErrorMessage` from `src/misc/request-helper.ts` rather
than falling back to `res.statusText`. When an optimistic UI update fails, roll the cache back
*and* toast; `useSwitchProxy` in `src/modules/proxies/hooks.ts` is the reference.

### Path alias

`~/*` maps to `src/*` (configured in both `tsconfig.json` and `vite.config.mts`) — use `~/...`
imports for anything outside the current directory rather than long relative paths.

### TypeScript strictness

`strict` is enabled except `noImplicitAny` and `strictNullChecks`, which are intentionally left off
for now (~180 and ~87 pre-existing violations respectively, per the comment in `tsconfig.json`) and
are being turned on incrementally. Don't add code that only typechecks because these two flags are
off — write it as if they were on.

### i18n

UI strings go through `i18next`/`react-i18next`; translations live in `src/i18n/`. Add new strings
there rather than hardcoding text in components.

### Supported URL query params (see README.md)

The app reads `hostname`, `port`, `secret`, `theme`, `title` from the page URL on load
(`src/store/app.ts`'s `parseConfigQueryString`) to let a Clash backend embed/deep-link a
pre-configured dashboard. Keep this working when touching `initialState`/`app.ts`.
