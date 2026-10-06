import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { Id, Page, User, UserWithPosts } from '../models/api.model';

export const DEFAULT_PAGE_SIZE = 5;

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/users`;

  /**
   * Paginated user search. An empty term lists everyone; otherwise the term is
   * matched (case-insensitively) against name OR email using json-server's
   * `_where` filter.
   */
  search(term: string, page = 1, perPage = DEFAULT_PAGE_SIZE): Observable<Page<User>> {
    let params = new HttpParams().set('_page', page).set('_per_page', perPage).set('_sort', 'name');
    const q = term.trim();
    if (q) {
      params = params.set(
        '_where',
        JSON.stringify({ or: [{ name: { contains: q } }, { email: { contains: q } }] }),
      );
    }
    return this.http.get<Page<User>>(this.url, { params });
  }

  /** One user with their posts embedded, in a single round trip. */
  getWithPosts(id: Id): Observable<UserWithPosts> {
    return this.http.get<UserWithPosts>(`${this.url}/${encodeURIComponent(id)}`, {
      params: { _embed: 'posts' },
    });
  }
}
