import { TestBed } from '@angular/core/testing';
import { HttpActivityService } from '../../../core/http/http-activity.service';
import { HttpLogComponent } from './http-log.component';

describe('HttpLogComponent', () => {
  it('renders entries with short, decoded URLs and clears finished ones', async () => {
    const fixture = TestBed.createComponent(HttpLogComponent);
    const activity = TestBed.inject(HttpActivityService);
    const done = activity.start('GET', '/api/users?_where=%7B%22a%22%7D');
    activity.finish(done, 503, 42);
    activity.start('POST', '/api/posts');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const rows = Array.from(el.querySelectorAll('li')).map((li) =>
      Array.from(li.children)
        .map((cell) => cell.textContent!.trim())
        .filter(Boolean)
        .join(' '),
    );
    expect(rows).toEqual(['POST /posts …', 'GET /users?_where={"a"} 503 42 ms']);
    expect(el.querySelector('li.fail')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('li').length).toBe(1);
  });
});
