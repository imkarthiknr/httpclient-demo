import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, finalize, tap } from 'rxjs';
import { HttpActivityService } from './http-activity.service';

/**
 * Records every request attempt (method, URL, status, duration) in
 * HttpActivityService. Registered inside the retry interceptor, so each retry
 * shows up as its own row.
 */
export const activityInterceptor: HttpInterceptorFn = (req, next) => {
  const activity = inject(HttpActivityService);

  // defer: an outer retry re-subscribes, and each attempt must get its own row.
  return defer(() => {
    const id = activity.start(req.method, req.urlWithParams);
    const started = performance.now();
    let status = 0;

    return next(req).pipe(
      tap({
        next: (event) => {
          if (event.type === HttpEventType.Response) status = event.status;
        },
        error: (err: unknown) => {
          status = err instanceof HttpErrorResponse ? err.status : 0;
        },
      }),
      // finalize also covers cancellation (e.g. switchMap unsubscribing).
      finalize(() => activity.finish(id, status, Math.round(performance.now() - started))),
    );
  });
};
