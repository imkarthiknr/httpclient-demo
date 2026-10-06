import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { defer, mergeMap, throwError, timer } from 'rxjs';

/** Random source, injectable so tests can make chaos deterministic. */
export const CHAOS_RANDOM = new InjectionToken<() => number>('CHAOS_RANDOM', {
  providedIn: 'root',
  factory: () => Math.random,
});

/** Demo switch: when enabled, a share of requests fail with 503 before reaching the API. */
@Injectable({ providedIn: 'root' })
export class ChaosService {
  readonly enabled = signal(false);
  readonly failureRate = 0.5;

  toggle(): void {
    this.enabled.update((on) => !on);
  }
}

/**
 * Simulates a flaky network so the retry interceptor, error states and the
 * HTTP log can be seen in action. Innermost interceptor, so every attempt
 * rolls the dice independently.
 */
export const chaosInterceptor: HttpInterceptorFn = (req, next) => {
  const chaos = inject(ChaosService);
  const random = inject(CHAOS_RANDOM);
  if (!chaos.enabled()) return next(req);

  return defer(() =>
    random() < chaos.failureRate
      ? // Fail after a short pause so it looks like a real round trip.
        timer(150).pipe(
          mergeMap(() =>
            throwError(
              () =>
                new HttpErrorResponse({
                  status: 503,
                  statusText: 'Service Unavailable (simulated)',
                  url: req.urlWithParams,
                }),
            ),
          ),
        )
      : next(req),
  );
};
