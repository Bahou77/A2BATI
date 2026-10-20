import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

import { routes } from './app.routes';

// Remplace le vert par défaut d'Aura par l'orange d'A2BATI (#f58a00).
const A2batiPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff6e8',
      100: '#ffe9c7',
      200: '#ffd08a',
      300: '#ffb44d',
      400: '#ff9d1f',
      500: '#f58a00',
      600: '#df7b00',
      700: '#b86200',
      800: '#924e00',
      900: '#763f00',
      950: '#442300'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    providePrimeNG({ theme: { preset: A2batiPreset } })
  ]
};
