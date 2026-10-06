import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Page, User } from '../../../core/models/api.model';
import { UserListComponent } from './user-list.component';

const user = (id: string, name: string): User => ({
  id,
  name,
  username: name.toLowerCase(),
  email: `${name.toLowerCase()}@example.com`,
  address: { city: 'Chennai' },
  company: { name: 'Acme' },
});

const page = (data: User[], p = 1, pages = 1): Page<User> => ({
  first: 1,
  prev: p > 1 ? p - 1 : null,
  next: p < pages ? p + 1 : null,
  last: pages,
  pages,
  items: data.length,
  data,
});

describe('UserListComponent', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const el = () => harness.routeNativeElement!;
  const settle = async () => {
    harness.detectChanges();
    await harness.fixture.whenStable();
  };
  const expectList = (match: (params: URLSearchParams) => boolean) =>
    http.expectOne(
      (r) => r.url === '/api/users' && match(new URLSearchParams(r.params.toString())),
    );

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'users', component: UserListComponent }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('loads the page and query from the URL', async () => {
    await harness.navigateByUrl('/users?q=ra&page=2', UserListComponent);
    expectList((p) => p.get('_page') === '2' && p.get('_where')!.includes('"ra"')).flush(
      page([user('1', 'Priya')], 2, 2),
    );
    await settle();
    expect(el().querySelector<HTMLInputElement>('#search')!.value).toBe('ra');
    expect(el().textContent).toContain('Priya');
    expect(el().textContent).toContain('Page 2 of 2');
  });

  it('pages forward by updating the URL', async () => {
    await harness.navigateByUrl('/users', UserListComponent);
    expectList((p) => p.get('_page') === '1').flush(page([user('1', 'A')], 1, 3));
    await settle();

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Next'))!
      .click();
    await settle();
    expect(TestBed.inject(Router).url).toBe('/users?page=2');
    expectList((p) => p.get('_page') === '2').flush(page([user('6', 'F')], 2, 3));
  });

  it('debounces typing, resets to page 1 and cancels the stale request', async () => {
    await harness.navigateByUrl('/users?page=3', UserListComponent);
    const stale = expectList((p) => p.get('_page') === '3');

    vi.useFakeTimers();
    try {
      const input = el().querySelector<HTMLInputElement>('#search')!;
      input.value = 'kim';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
    } finally {
      vi.useRealTimers();
    }
    await settle();

    expect(TestBed.inject(Router).url).toBe('/users?q=kim');
    expect(stale.cancelled).toBe(true);
    expectList((p) => p.get('_page') === '1' && p.get('_where')!.includes('kim')).flush(
      page([user('7', 'Daniel Kim')]),
    );
  });

  it('shows an empty state for no matches', async () => {
    await harness.navigateByUrl('/users?q=zzz', UserListComponent);
    expectList(() => true).flush(page([]));
    await settle();
    expect(el().textContent).toContain('No users match “zzz”.');
  });

  it('shows an error and retries on demand', async () => {
    await harness.navigateByUrl('/users', UserListComponent);
    expectList(() => true).flush(null, { status: 0, statusText: 'Unknown Error' });
    await settle();
    expect(el().querySelector('[role=alert]')?.textContent).toContain('Cannot reach the API');

    el().querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    expectList(() => true).flush(page([user('1', 'Priya')]));
    await settle();
    expect(el().querySelector('[role=alert]')).toBeNull();
    expect(el().textContent).toContain('Priya');
  });
});
