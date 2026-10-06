import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { UserWithPosts } from '../../../core/models/api.model';
import { UserDetailComponent } from './user-detail.component';

const priya: UserWithPosts = {
  id: '1',
  name: 'Priya Raman',
  username: 'priya',
  email: 'priya@example.com',
  address: { city: 'Chennai' },
  company: { name: 'Kaveri Labs' },
  posts: [
    { id: '1', userId: '1', title: 'Older post', body: 'a' },
    { id: '2', userId: '1', title: 'Newer post', body: 'b' },
  ],
};

describe('UserDetailComponent', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const el = () => harness.routeNativeElement!;
  const settle = async () => {
    harness.detectChanges();
    await harness.fixture.whenStable();
  };
  const titles = () => Array.from(el().querySelectorAll('.post strong')).map((n) => n.textContent);
  const type = (selector: string, value: string) => {
    const input = el().querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'users/:id', component: UserDetailComponent }],
          withComponentInputBinding(),
        ),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/users/1', UserDetailComponent);
  });

  afterEach(() => http.verify());

  const loadPriya = async () => {
    http.expectOne('/api/users/1?_embed=posts').flush(priya);
    await settle();
  };

  it('renders the profile and posts newest first', async () => {
    await loadPriya();
    expect(el().querySelector('h2')?.textContent).toContain('Priya Raman');
    expect(titles()).toEqual(['Newer post', 'Older post']);
  });

  it('shows a 404 message with retry', async () => {
    http
      .expectOne('/api/users/1?_embed=posts')
      .flush(null, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(el().textContent).toContain('Not found');
    el().querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    await loadPriya();
    expect(titles().length).toBe(2);
  });

  it('validates, then POSTs a new post and prepends it', async () => {
    await loadPriya();
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
    http.expectNone('/api/posts');
    expect(el().textContent).toContain('A title is required');

    type('#title', ' Hello ');
    type('#body', 'World');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne({ method: 'POST', url: '/api/posts' });
    expect(req.request.body).toEqual({ userId: '1', title: 'Hello', body: 'World' });
    req.flush({ id: '3', userId: '1', title: 'Hello', body: 'World' });
    await settle();
    expect(titles()[0]).toBe('Hello');
  });

  it('edits a title with PATCH', async () => {
    await loadPriya();
    el().querySelector<HTMLButtonElement>('[aria-label="Edit Older post"]')!.click();
    await settle();
    type('#edit-1', 'Renamed');
    el().querySelector('form.edit')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne({ method: 'PATCH', url: '/api/posts/1' });
    expect(req.request.body).toEqual({ title: 'Renamed' });
    req.flush({ ...priya.posts[0], title: 'Renamed' });
    await settle();
    expect(titles()).toEqual(['Newer post', 'Renamed']);
  });

  it('deletes optimistically and rolls back if the API fails', async () => {
    await loadPriya();
    el().querySelector<HTMLButtonElement>('[aria-label="Delete Newer post"]')!.click();
    await settle();
    expect(titles()).toEqual(['Older post']); // removed before the server answers

    http
      .expectOne({ method: 'DELETE', url: '/api/posts/2' })
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(titles()).toEqual(['Newer post', 'Older post']); // restored in place
    expect(el().querySelector('[role=alert]')?.textContent).toContain('Could not delete');
  });
});
