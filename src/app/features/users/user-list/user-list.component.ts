import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs';
import { describeHttpError } from '../../../core/http/http-error';
import { Page, User } from '../../../core/models/api.model';
import { UsersService } from '../../../core/services/users.service';

interface ListQuery {
  q: string;
  page: number;
}

/**
 * Paginated, searchable user directory.
 *
 * State lives in the URL (`/users?q=ra&page=2`): typing or paging only updates
 * query params, and a single queryParamMap → switchMap pipeline performs the
 * request, cancelling any request still in flight.
 */
@Component({
  selector: 'app-user-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
})
export class UserListComponent {
  private readonly users = inject(UsersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly page = signal<Page<User> | null>(null);
  protected readonly query = signal<ListQuery>({ q: '', page: 1 });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // URL → request
    this.route.queryParamMap
      .pipe(
        map((p): ListQuery => ({
          q: p.get('q') ?? '',
          page: Math.max(1, Number(p.get('page')) || 1),
        })),
        distinctUntilChanged((a, b) => a.q === b.q && a.page === b.page),
        tap((query) => {
          this.query.set(query);
          if (this.search.value !== query.q) this.search.setValue(query.q, { emitEvent: false });
        }),
        switchMap((query) => this.load(query)),
        takeUntilDestroyed(),
      )
      .subscribe();

    // Typing → URL (debounced, resets to page 1)
    this.search.valueChanges
      .pipe(
        debounceTime(300),
        map((v) => v.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.navigate({ q, page: 1 }));
  }

  protected goTo(page: number): void {
    this.navigate({ ...this.query(), page });
  }

  protected retry(): void {
    this.load(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private load(query: ListQuery) {
    this.loading.set(true);
    this.error.set(null);
    return this.users.search(query.q, query.page).pipe(
      tap((page) => {
        this.loading.set(false);
        this.page.set(page);
      }),
      catchError((err: unknown) => {
        this.loading.set(false);
        this.error.set(describeHttpError(err));
        return EMPTY;
      }),
    );
  }

  private navigate({ q, page }: ListQuery): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null, page: page > 1 ? page : null },
      replaceUrl: true,
    });
  }
}
