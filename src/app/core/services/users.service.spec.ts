import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-config';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists a page sorted by name without a filter when the term is blank', () => {
    service.search('  ', 2).subscribe();
    const req = http.expectOne((r) => r.url === '/api/users');
    expect(req.request.params.get('_page')).toBe('2');
    expect(req.request.params.get('_per_page')).toBe('5');
    expect(req.request.params.get('_sort')).toBe('name');
    expect(req.request.params.has('_where')).toBe(false);
    req.flush({ data: [] });
  });

  it('matches the term against name OR email via _where', () => {
    service.search(' ra ').subscribe();
    const req = http.expectOne((r) => r.url === '/api/users');
    expect(JSON.parse(req.request.params.get('_where')!)).toEqual({
      or: [{ name: { contains: 'ra' } }, { email: { contains: 'ra' } }],
    });
    req.flush({ data: [] });
  });

  it('fetches a user with posts embedded', () => {
    service.getWithPosts('7').subscribe();
    http.expectOne('/api/users/7?_embed=posts').flush({ id: '7', posts: [] });
  });

  it('respects a custom API_BASE_URL', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.com' },
      ],
    });
    const custom = TestBed.inject(UsersService);
    const ctrl = TestBed.inject(HttpTestingController);
    custom.getWithPosts('1').subscribe();
    ctrl.expectOne('https://api.example.com/users/1?_embed=posts').flush({});
    ctrl.verify();
  });
});
