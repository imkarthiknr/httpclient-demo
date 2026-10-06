import { Injectable, computed, signal } from '@angular/core';

export interface HttpActivityEntry {
  id: number;
  method: string;
  url: string;
  status: number | null;
  durationMs: number | null;
  ok: boolean | null;
  startedAt: Date;
}

const MAX_ENTRIES = 50;

/** In-memory log of HTTP traffic, fed by activityInterceptor. */
@Injectable({ providedIn: 'root' })
export class HttpActivityService {
  private nextId = 1;
  private readonly _entries = signal<HttpActivityEntry[]>([]);

  /** Newest first. */
  readonly entries = this._entries.asReadonly();
  readonly inFlight = computed(() => this._entries().filter((e) => e.status === null).length);

  start(method: string, url: string): number {
    const id = this.nextId++;
    const entry: HttpActivityEntry = {
      id,
      method,
      url,
      status: null,
      durationMs: null,
      ok: null,
      startedAt: new Date(),
    };
    this._entries.update((list) => [entry, ...list].slice(0, MAX_ENTRIES));
    return id;
  }

  finish(id: number, status: number, durationMs: number): void {
    this._entries.update((list) =>
      list.map((e) =>
        e.id === id ? { ...e, status, durationMs, ok: status >= 200 && status < 400 } : e,
      ),
    );
  }

  clear(): void {
    this._entries.update((list) => list.filter((e) => e.status === null));
  }
}
