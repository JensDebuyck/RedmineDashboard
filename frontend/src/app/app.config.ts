import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { DashboardComponent } from './components/dashboard/dashboard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),

    provideRouter([
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },

      // 👇 tijdelijk placeholder (stats maken we zo)
      {
        path: 'stats',
        loadComponent: () =>
          import('./components/stats/stats').then(m => m.StatsComponent)
      }
    ])
  ],
};
