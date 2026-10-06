# Contributing

Thanks for your interest!

## Reporting issues

Open an [issue](https://github.com/imkarthiknr/httpclient-demo/issues) with what you expected, what happened, steps to reproduce, and your OS, Node.js and browser versions.

## Making changes

1. Fork and branch from `master`: `git checkout -b feat/short-description`.
2. Set up the project with [DEVELOPMENT.md](DEVELOPMENT.md).
3. Make your change **with tests**. New HTTP behaviour needs a unit test with `HttpTestingController`, and user-visible flows should get an e2e test too.
4. Check everything locally:

   ```bash
   npm run format:check
   npm test
   npm run e2e
   npm run build
   ```

5. Commit using [Conventional Commits](https://www.conventionalcommits.org/), for example `feat: add caching interceptor`.
6. Open a pull request explaining **what** and **why**. Include screenshots for UI changes.

## Guidelines

- Keep pull requests focused.
- Components talk to services, never to `HttpClient` directly.
- Don't commit `mock-api/db.json`. Change `mock-api/seed.json` instead.
