import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { activityInterceptor } from './activity.interceptor';
import { CHAOS_RANDOM, ChaosService, chaosInterceptor } from './chaos';
import { SKIP_RETRY } from './context-tokens';
import { HttpActivityService } from './http-activity.service';
import { describeHttpError } from './http-error';
import { retryInterceptor } from './retry.interceptor';

/** Same interceptor chain as app.config.ts. */
function setup(random: () => number = () => 1) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(
        withInterceptors([retryInterceptor, activityInterceptor, chaosInterceptor]),
      ),
      provideHttpClientTesting(),
      { provide: CHAOS_RANDOM, useValue: random },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    ctrl: TestBed.inject(HttpTestingController),
    activity: TestBed.inject(HttpActivityService),
    chaos: TestBed.inject(ChaosService),
  };
}

const fail503 = { status: 503, statusText: 'Service Unavailable' };

describe('HTTP interceptors', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.inject(HttpTestingController).verify();
  });

  describe('retryInterceptor', () => {
    it('retries a GET after a 503 with backoff and then succeeds', () => {
      const { http, ctrl } = setup();
      let result: unknown;
      http.get('/api/x').subscribe((r) => (result = r));

      ctrl.expectOne('/api/x').flush(null, fail503);
      ctrl.expectNone('/api/x'); // waiting for backoff
      vi.advanceTimersByTime(300);
      ctrl.expectOne('/api/x').flush({ ok: true });
      expect(result).toEqual({ ok: true });
    });

    it('gives up after two retries (three attempts)', () => {
      const { http, ctrl } = setup();
      let error: unknown;
      http.get('/api/x').subscribe({ error: (e) => (error = e) });

      ctrl.expectOne('/api/x').flush(null, fail503);
      vi.advanceTimersByTime(300);
      ctrl.expectOne('/api/x').flush(null, fail503);
      vi.advanceTimersByTime(600);
      ctrl.expectOne('/api/x').flush(null, fail503);
      expect(describeHttpError(error)).toContain('503');
    });

    it('does not retry 4xx responses', () => {
      const { http, ctrl } = setup();
      let error: unknown;
      http.get('/api/x').subscribe({ error: (e) => (error = e) });
      ctrl.expectOne('/api/x').flush(null, { status: 404, statusText: 'Not Found' });
      vi.advanceTimersByTime(5000);
      ctrl.expectNone('/api/x');
      expect(describeHttpError(error)).toContain('Not found');
    });

    it('never retries non-GET requests', () => {
      const { http, ctrl } = setup();
      http.post('/api/x', {}).subscribe({ error: () => undefined });
      ctrl.expectOne('/api/x').flush(null, fail503);
      vi.advanceTimersByTime(5000);
      ctrl.expectNone('/api/x');
    });

    it('can be disabled per request with SKIP_RETRY', () => {
      const { http, ctrl } = setup();
      http
        .get('/api/x', { context: new HttpContext().set(SKIP_RETRY, true) })
        .subscribe({ error: () => undefined });
      ctrl.expectOne('/api/x').flush(null, fail503);
      vi.advanceTimersByTime(5000);
      ctrl.expectNone('/api/x');
    });
  });

  describe('activityInterceptor', () => {
    it('logs each attempt, including retries, newest first', () => {
      const { http, ctrl, activity } = setup();
      http.get('/api/x?a=1').subscribe();

      expect(activity.inFlight()).toBe(1);
      ctrl.expectOne('/api/x?a=1').flush(null, fail503);
      vi.advanceTimersByTime(300);
      ctrl.expectOne('/api/x?a=1').flush({});

      const entries = activity.entries();
      expect(entries.map((e) => [e.method, e.url, e.status, e.ok])).toEqual([
        ['GET', '/api/x?a=1', 200, true],
        ['GET', '/api/x?a=1', 503, false],
      ]);
      expect(activity.inFlight()).toBe(0);
    });

    it('closes the entry when a request is cancelled', () => {
      const { http, ctrl, activity } = setup();
      const sub = http.get('/api/slow').subscribe();
      sub.unsubscribe();
      expect(ctrl.expectOne('/api/slow').cancelled).toBe(true);
      expect(activity.inFlight()).toBe(0);
    });

    it('clear() keeps in-flight entries', () => {
      const { http, ctrl, activity } = setup();
      http.get('/api/done').subscribe();
      ctrl.expectOne('/api/done').flush({});
      http.get('/api/pending').subscribe();
      activity.clear();
      expect(activity.entries().map((e) => e.url)).toEqual(['/api/pending']);
      ctrl.expectOne('/api/pending').flush({});
    });
  });

  describe('chaosInterceptor', () => {
    it('passes requests through when disabled', () => {
      const { http, ctrl } = setup(() => 0);
      http.get('/api/x').subscribe();
      ctrl.expectOne('/api/x').flush({});
    });

    it('fails a request with a simulated 503 when the dice say so', () => {
      const rolls = [0.1, 0.9]; // first attempt fails, retry succeeds
      const { http, ctrl, chaos, activity } = setup(() => rolls.shift()!);
      chaos.toggle();

      let result: unknown;
      http.get('/api/x').subscribe((r) => (result = r));
      ctrl.expectNone('/api/x'); // never reached the backend
      vi.advanceTimersByTime(150 + 300);
      ctrl.expectOne('/api/x').flush({ ok: true });

      expect(result).toEqual({ ok: true });
      expect(activity.entries().map((e) => e.status)).toEqual([200, 503]);
    });
  });
});
