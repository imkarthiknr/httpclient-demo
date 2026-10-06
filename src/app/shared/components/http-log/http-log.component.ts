import { Component, inject } from '@angular/core';
import { HttpActivityService } from '../../../core/http/http-activity.service';

/** Live panel listing every HTTP attempt captured by the activity interceptor. */
@Component({
  selector: 'app-http-log',
  templateUrl: './http-log.component.html',
  styleUrl: './http-log.component.css',
})
export class HttpLogComponent {
  protected readonly activity = inject(HttpActivityService);

  /** Show `/api/users?_page=1` as `/users?_page=1`, decoded for readability. */
  protected shortUrl(url: string): string {
    const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '');
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }
}
