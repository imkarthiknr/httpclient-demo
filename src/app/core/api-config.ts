import { InjectionToken } from '@angular/core';

/**
 * Base URL of the REST API. Defaults to `/api`, which the Angular dev server
 * proxies to json-server (see proxy.conf.json). Override it in
 * `app.config.ts` to point the app at a different backend.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
