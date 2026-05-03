import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { DashboardComponent } from './components/dashboard/dashboard';
import { NotesComponent} from './components/notes/notes';
import {MyTicketsComponent} from './components/my-tickets/my-tickets';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),

    provideRouter([
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', component: DashboardComponent },

      { path: 'my-tickets', component: MyTicketsComponent },

      {
        path: 'stats',
        loadComponent: () =>
          import('./components/stats/stats').then(m => m.StatsComponent)
      },

      {path: 'notes', component: NotesComponent },

      // ⚠️ ALTIJD LAATSTE
      { path: '**', redirectTo: 'dashboard' }
    ])
  ],
};
