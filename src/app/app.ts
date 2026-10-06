import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ChaosService } from './core/http/chaos';
import { HttpActivityService } from './core/http/http-activity.service';
import { HttpLogComponent } from './shared/components/http-log/http-log.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, HttpLogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly activity = inject(HttpActivityService);
  protected readonly chaos = inject(ChaosService);
}
