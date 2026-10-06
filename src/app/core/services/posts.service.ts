import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { Id, NewPost, Post } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/posts`;

  create(post: NewPost): Observable<Post> {
    return this.http.post<Post>(this.url, post);
  }

  /** Partial update: only the fields provided are changed. */
  update(id: Id, changes: Partial<NewPost>): Observable<Post> {
    return this.http.patch<Post>(`${this.url}/${encodeURIComponent(id)}`, changes);
  }

  delete(id: Id): Observable<unknown> {
    return this.http.delete(`${this.url}/${encodeURIComponent(id)}`);
  }
}
