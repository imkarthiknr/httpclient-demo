import { HttpErrorResponse } from '@angular/common/http';

/** Map any HTTP failure to a short message that is safe to show users. */
export function describeHttpError(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
  switch (true) {
    case err.status === 0:
      return 'Cannot reach the API. Is the mock server running (npm run api)?';
    case err.status === 404:
      return 'Not found. It may have been deleted.';
    case err.status === 400 || err.status === 422:
      return 'The server rejected the request. Check your input.';
    case err.status >= 500:
      return `The server had a problem (${err.status}). Please try again.`;
    default:
      return `Request failed (${err.status}).`;
  }
}
