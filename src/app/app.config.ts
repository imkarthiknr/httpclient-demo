import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { activityInterceptor } from './core/http/activity.interceptor';
import { chaosInterceptor } from './core/http/chaos';
import { retryInterceptor } from './core/http/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      // Order matters: the first interceptor is the outermost.
      //   retry → activity → chaos → network
      // so every retry attempt is logged, and chaos can fail each attempt independently.
      withInterceptors([retryInterceptor, activityInterceptor, chaosInterceptor]),
    ),
  ],
};
