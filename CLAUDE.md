# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Yacd ("Yet Another Clash Dashboard") is a web UI for the Clash/Meta proxy backend's HTTP/WebSocket
control API (`external-controller`). It's a Vite + React 19 + TypeScript SPA with no backend of its
own — it only talks to a Clash-compatible API server.

## Commands

```sh
pnpm i           # install deps (pnpm is required, see packageManager in package.json)
pnpm start       # dev server at http://127.0.0.1:3000 (alias: pnpm dev)
pnpm build       # production build, output goes to ./public (not ./dist, see vite.config.ts)
pnpm serve       # preview a production build
pnpm lint        # eslint src
pnpm typecheck   # tsc --noEmit
```

There is no test suite in this repo (no test runner configured, no `*.test.*` files) — do not add
a `test` script or assume one exists.

`pnpm build` writes to `public/` intentionally (not the Vite default `dist/`) so it can be served
directly as static assets/gh-pages; don't "fix" this.

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

1. **Custom Redux-like store** (`src/components/StateProvider.tsx` + `src/store/*`): a hand-rolled
   context/reducer store using `immer.produce` for updates, not Redux. Actions are plain functions
   dispatched via `dispatch(actionCreator(...))`; an action creator can itself be a thunk
   `(dispatch, getState) => {...}` for async/side-effecting work (see `src/store/app.ts`,
   `src/store/proxies.tsx`). Components read state via `connect(mapStateToProps)` (see
   `src/store/index.ts` for the root `initialState`/`actions` shape). This holds `app` (API config,
   theme, UI prefs — persisted to localStorage via `src/misc/storage.ts`), `modals`, `configs`,
   `proxies`, `logs`.
2. **jotai atoms + TanStack Query**: newer code (added during the recoil/react-table migration —
   see git history) uses jotai for small local/UI state and `@tanstack/react-query` for
   server-state fetching/caching. Prefer this pattern for *new* data-fetching code; the legacy
   store is being incrementally migrated away from, not extended.

### Feature module layout

Each feature has a consistent split:
- `src/modules/<feature>/hooks.ts` — the feature's logic (data fetching, filtering/sorting,
  derived state) as hooks, kept separate from rendering.
- `src/modules/<feature>/utils.ts` — pure helpers used by the hooks/components.
- `src/components/<feature>/*.tsx` or `src/components/<Feature>.tsx` — presentational components.
- `src/pages/<Feature>Page.tsx` — route-level composition, wired up in the router.

When adding a feature, follow this split rather than putting fetch/business logic directly in
components.

### Path alias

`~/*` maps to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`) — use `~/...`
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
