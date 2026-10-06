import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';
import { SKIP_RETRY } from './context-tokens';

export const MAX_RETRIES = 2;
export const BASE_DELAY_MS = 300;

/** Only idempotent reads are retried, and only for transient failures. */
const isRetryable = (error: unknown) =>
  error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);

/**
 * Retries GET requests on network errors and 5xx responses with exponential
 * backoff (300 ms, 600 ms). 4xx responses fail immediately. Opt out per
 * request with the SKIP_RETRY context token.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || req.context.get(SKIP_RETRY)) return next(req);
  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, attempt) => {
        if (!isRetryable(error)) throw error;
        return timer(BASE_DELAY_MS * 2 ** (attempt - 1));
      },
    }),
  );
};
