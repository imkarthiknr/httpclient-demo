import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, merge, switchMap, tap } from 'rxjs';
import { describeHttpError } from '../../../core/http/http-error';
import { Id, Post, User } from '../../../core/models/api.model';
import { PostsService } from '../../../core/services/posts.service';
import { UsersService } from '../../../core/services/users.service';

/**
 * A user's profile and posts, showing every write verb:
 * POST (create), PATCH (edit title) and DELETE (optimistic, with rollback).
 */
@Component({
  selector: 'app-user-detail',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css',
})
export class UserDetailComponent {
  private readonly users = inject(UsersService);
  private readonly postsApi = inject(PostsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reload$ = new Subject<void>();

  /** Bound from the `:id` route param. */
  readonly id = input.required<Id>();

  protected readonly user = signal<User | null>(null);
  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<Id | null>(null);

  protected readonly newPost = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    body: ['', [Validators.required, Validators.maxLength(2000)]],
  });
  protected readonly editTitle = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });

  constructor() {
    merge(toObservable(this.id), this.reload$)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(null);
        }),
        switchMap(() =>
          this.users.getWithPosts(this.id()).pipe(
            catchError((err: unknown) => {
              this.loading.set(false);
              this.loadError.set(describeHttpError(err));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ posts, ...user }) => {
        this.loading.set(false);
        this.user.set(user);
        this.posts.set([...posts].reverse()); // newest first
      });
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected createPost(): void {
    if (this.newPost.invalid) {
      this.newPost.markAllAsTouched();
      return;
    }
    const { title, body } = this.newPost.getRawValue();
    this.saving.set(true);
    this.actionError.set(null);
    this.postsApi.create({ userId: this.id(), title: title.trim(), body: body.trim() }).subscribe({
      next: (post) => {
        this.saving.set(false);
        this.posts.update((list) => [post, ...list]);
        this.newPost.reset();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(describeHttpError(err));
      },
    });
  }

  protected startEdit(post: Post): void {
    this.editingId.set(post.id);
    this.editTitle.setValue(post.title);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected saveEdit(post: Post): void {
    if (this.editTitle.invalid) return;
    const title = this.editTitle.value.trim();
    this.actionError.set(null);
    this.postsApi.update(post.id, { title }).subscribe({
      next: (updated) => {
        this.posts.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.editingId.set(null);
      },
      error: (err: unknown) => this.actionError.set(describeHttpError(err)),
    });
  }

  /** Optimistic delete: remove immediately, restore at the same index if the API fails. */
  protected deletePost(post: Post): void {
    const before = this.posts();
    this.posts.set(before.filter((p) => p.id !== post.id));
    this.actionError.set(null);
    this.postsApi.delete(post.id).subscribe({
      error: (err: unknown) => {
        this.posts.set(before);
        this.actionError.set(`Could not delete “${post.title}”. ${describeHttpError(err)}`);
      },
    });
  }
}
