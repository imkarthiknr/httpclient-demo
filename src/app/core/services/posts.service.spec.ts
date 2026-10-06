import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PostsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates with POST', () => {
    const post = { userId: '1', title: 'T', body: 'B' };
    service.create(post).subscribe();
    const req = http.expectOne('/api/posts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(post);
    req.flush({ id: '9', ...post });
  });

  it('updates with PATCH, sending only the changed fields', () => {
    service.update('3', { title: 'New' }).subscribe();
    const req = http.expectOne('/api/posts/3');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'New' });
    req.flush({});
  });

  it('deletes with DELETE', () => {
    service.delete('4').subscribe();
    expect(http.expectOne('/api/posts/4').request.method).toBe('DELETE');
  });
});
