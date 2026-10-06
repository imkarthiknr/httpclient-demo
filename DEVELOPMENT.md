# Development Guide

Everything you need to run, test and extend the project. For an overview of what it demonstrates, see the [README](README.md).

- [Prerequisites](#prerequisites)
- [Setup and running](#setup-and-running)
- [The mock API](#the-mock-api)
- [Architecture](#architecture)
- [Testing](#testing)
- [Code style](#code-style)
- [Continuous integration](#continuous-integration)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

## Prerequisites

| Tool    | Version                                  |
| ------- | ---------------------------------------- |
| Node.js | `^22.12.0` or `>=24` (`.nvmrc` pins 22). json-server 1.x requires 22.12+ |
| npm     | 10+                                      |

You don't need a global Angular CLI. The scripts use the local one.

## Setup and running

```bash
npm install
npm start            # = npm run api  +  ng serve
```

| Process     | URL                    |
| ----------- | ---------------------- |
| App         | http://localhost:4200  |
| Mock API    | http://localhost:3000  |

The app always calls **`/api/...`**. The Angular dev server proxies those requests to json-server and strips the `/api` prefix (`proxy.conf.json`), so the browser talks to one origin and CORS never comes up.

To run the processes separately, use `npm run api` and `npm run start:web` in two terminals.

## The mock API

[json-server](https://github.com/typicode/json-server) turns [`mock-api/seed.json`](mock-api/seed.json) into a REST API with `users` and `posts` (`posts.userId` → `users.id`).

- **Seed vs working copy.** `mock-api/serve.mjs` copies `seed.json` to `mock-api/db.json` (gitignored) and serves that copy. Writes you make while developing never touch the committed seed.
- **Resetting.** `npm run api:reset` starts again from the seed. The e2e tests always start this way.
- **IDs are strings** in json-server 1.x, so the `Id` type in `api.model.ts` is `string`.

Requests the app makes:

| Purpose            | Request                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| List / page        | `GET /users?_page=2&_per_page=5&_sort=name` returns a `Page<User>` envelope (`data`, `pages`, `prev`, `next`, …) |
| Search             | the same request plus `_where={"or":[{"name":{"contains":"ra"}},{"email":{"contains":"ra"}}]}` |
| User + posts       | `GET /users/1?_embed=posts`                                                               |
| Create post        | `POST /posts` with `{ userId, title, body }`                                              |
| Rename post        | `PATCH /posts/3` with `{ title }`                                                         |
| Delete post        | `DELETE /posts/3`                                                                         |

json-server 1.x is still in beta, so the version is pinned exactly in `package.json`.

## Architecture

```
src/app/
├── core/                    App-wide, no UI
│   ├── api-config.ts        API_BASE_URL InjectionToken (default '/api')
│   ├── models/              Interfaces mirroring the API
│   ├── services/            One service per resource; components never build URLs
│   └── http/                Cross-cutting HTTP concerns
│       ├── retry.interceptor.ts
│       ├── activity.interceptor.ts + http-activity.service.ts
│       ├── chaos.ts         ChaosService + chaosInterceptor + CHAOS_RANDOM token
│       ├── context-tokens.ts
│       └── http-error.ts
├── features/users/          Routed, lazy-loaded pages
└── shared/components/       Reusable UI (HTTP log)
```

### Key decisions

**Interceptor order** (`app.config.ts`): `retry → activity → chaos`. The first interceptor in the array is the outermost.

- `retry` re-subscribes to everything inside it, so placing `activity` inside means each attempt is logged. `activity` wraps its work in `defer()` so that a re-subscription creates a fresh log entry instead of reusing the first one.
- `chaos` is innermost, so every attempt independently decides whether to fail.

**Retry policy**: only `GET`, only for status `0` (network) or `>= 500`, at most 2 retries with 300 ms then 600 ms backoff. A `4xx` fails immediately, because retrying a bad request won't fix it. Set `SKIP_RETRY` in the request's `HttpContext` to opt out.

**Cancellation**: the user list derives requests from `queryParamMap` through `switchMap`, so a new search or page cancels the request still in flight. The activity interceptor's `finalize` closes the log entry for cancelled requests too.

**State in the URL**: typing and paging only update `?q=` and `?page=`, using `replaceUrl` so the history isn't flooded. The URL is the single source of truth, which makes views shareable and reloadable.

**Optimistic delete**: the post disappears immediately. If the API fails, the previous list is restored, so the post returns to the same position, and an error is shown. Create and edit are pessimistic (they wait for the server), which shows the contrast.

**Testability seams**: `API_BASE_URL` and `CHAOS_RANDOM` are injection tokens, so tests can point the app at another backend or make chaos deterministic without monkey-patching.

## Testing

### Unit tests (Vitest)

```bash
npm test              # single run (36 tests)
npm run test:watch
```

| File                          | Covers                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `users.service.spec.ts`       | Paging params, `_where` search filter, `_embed`, custom `API_BASE_URL`              |
| `posts.service.spec.ts`       | POST, PATCH (only changed fields), DELETE                                           |
| `interceptors.spec.ts`        | The full interceptor chain: retry with backoff, give-up, no retry on 4xx or POST, `SKIP_RETRY`, per-attempt logging, cancellation, chaos |
| `http-error.spec.ts`          | Status → message mapping                                                            |
| `user-list.component.spec.ts` | URL → request, paging, debounce plus cancellation of the stale request, empty state, error and retry |
| `user-detail.component.spec.ts` | Load and 404, create with validation, PATCH edit, optimistic delete rollback      |
| `http-log.component.spec.ts`, `app.spec.ts` | Log rendering and clearing, chaos toggle                              |

Conventions:

- HTTP is faked with `provideHttpClientTesting()`, and every suite calls `HttpTestingController.verify()` in `afterEach`, which fails a test on any unexpected request.
- Time-based behaviour (debounce, backoff) uses `vi.useFakeTimers()` and `vi.advanceTimersByTime()`.
- Routed components are tested through `RouterTestingHarness`, so query params and input binding behave as they do in the app.

### End-to-end tests (Playwright)

```bash
npx playwright install chromium   # first time only
npm run e2e
```

Playwright starts `npm run api:reset` and `ng serve` itself (see `playwright.config.ts`), then runs against the real mock API. It covers URL-driven search and pagination, the 404 page, full post CRUD that survives a reload, the HTTP log, and the flaky-network retry path. That last test stubs `Math.random` for a deterministic outcome.

To use a Chromium you already have, set `CHROMIUM_PATH=/path/to/chrome`.

## Code style

- **Prettier** (`.prettierrc`, 100 columns, single quotes): `npm run format`. CI runs `format:check`.
- **`.editorconfig`** and **`.gitattributes`** (LF in the repository, so Windows checkouts don't show whole-file diffs).
- **TypeScript** runs in `strict` mode with `strictTemplates`.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/).

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `master` and on pull requests:

1. **Lint, unit tests and build**: `format:check`, `typecheck:e2e`, `npm test`, `npm run build`
2. **End-to-end**: installs Chromium and runs `npm run e2e`. On failure, the Playwright report and traces are uploaded as an artifact.

## Common tasks

**Add a resource (e.g. comments)**

1. Add a `comments` array to `mock-api/seed.json` (with `postId`), then run `npm run api:reset`.
2. Add a `Comment` interface in `api.model.ts` and a `CommentsService` in `core/services/`.
3. Use it from a feature component, and add service and component specs.

**Point the app at a real backend**

Provide a different base URL in `app.config.ts`:

```ts
{ provide: API_BASE_URL, useValue: 'https://api.example.com' }
```

**Add an interceptor** (e.g. an auth header)

Write a `HttpInterceptorFn` in `core/http/` and add it to `withInterceptors([...])`. Think about where it belongs in the chain. An auth header should sit inside `retry`, so that every attempt carries a fresh token.

## Troubleshooting

| Symptom                                                    | Fix                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| *"Cannot reach the API. Is the mock server running?"*      | Start it with `npm run api`, or use `npm start` to run both.                          |
| `EADDRINUSE` on 3000 or 4200                               | Something else is using the port. Stop it, or change the port in `serve.mjs` (`API_PORT`) and `proxy.conf.json`. |
| Data looks wrong after experimenting                       | `npm run api:reset`                                                                   |
| E2E: `http://localhost:3000/users is already used`         | Stop your dev servers first. Playwright starts its own.                               |
| E2E: `Executable doesn't exist`                            | `npx playwright install chromium`, or set `CHROMIUM_PATH`.                            |
| `npm install` fails with `reading 'edgesOut'`              | A known npm 10 bug. Use `npm ci` (the lockfile is committed) or `npx npm@11 install`. |

## Roadmap

- [ ] `httpResource()` / `resource()` versions of the list and detail pages, side by side with the RxJS versions
- [ ] Caching interceptor (stale-while-revalidate) with a cache-hit indicator in the log
- [ ] Upload with progress events (`reportProgress: true`)
- [ ] Auth interceptor with token refresh on `401`
- [ ] Deploy a static demo backed by an in-browser mock (MSW)
