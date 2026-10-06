# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-06

A complete rebuild of the original 2020 experiment into a documented, tested `HttpClient` reference app.

### Added

- User directory with debounced search, pagination and URL-driven state.
- User detail page with posts: create (POST), rename (PATCH) and optimistic delete with rollback (DELETE).
- Functional interceptors: retry with exponential backoff, request activity logging and a loading bar, and a fault-injection ("flaky network") interceptor.
- Live HTTP log panel.
- `API_BASE_URL` and `CHAOS_RANDOM` injection tokens and the `SKIP_RETRY` context token.
- json-server mock API (`mock-api/`) with committed seed data and a resettable working copy.
- 36 Vitest unit tests and 5 Playwright end-to-end tests.
- GitHub Actions CI (format, type-check, unit tests, build, e2e).
- README, DEVELOPMENT guide, CONTRIBUTING, MIT license, screenshots.

### Changed

- Upgraded Angular 10 (NgModules, Zone.js, Karma, Protractor, TSLint) → Angular 21 (standalone components, signals, zoneless, Vitest, Playwright, Prettier).
- Hard-coded `http://jsonplaceholder.typicode.com` and `http://localhost:3000` URLs replaced by a relative `/api` behind a dev proxy.

### Fixed

- The original code did not compile: an unclosed method, the invalid `{click}` binding syntax, a missing `Observable` import and an undefined `http` in `DataserviceService`.
- Line-ending churn on Windows checkouts (`.gitattributes`).

### Removed

- Unused `DataserviceService`, an empty `files.json` and Angular CLI placeholder specs.

## [0.1.0] - 2020-08-07

### Added

- First experiment with Angular 10 `HttpClient`: fetch a user from JSONPlaceholder by ID and post the search term to a local json-server.

[1.0.0]: https://github.com/imkarthiknr/httpclient-demo/compare/8f790e2...master
[0.1.0]: https://github.com/imkarthiknr/httpclient-demo/commit/8f790e2
