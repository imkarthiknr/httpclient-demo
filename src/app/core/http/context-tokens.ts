import { HttpContextToken } from '@angular/common/http';

/**
 * Set on a request to opt out of automatic retries, e.g.
 * `http.get(url, { context: new HttpContext().set(SKIP_RETRY, true) })`.
 */
export const SKIP_RETRY = new HttpContextToken<boolean>(() => false);
