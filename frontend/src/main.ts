import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app/app-routing-module';
import { authInterceptor } from './app/interceptors/auth.interceptor';
// Locale (fix NG0701 currency/date pipe missing locale data for 'it-IT')
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';

// Register with explicit alias 'it-IT' so using that id in templates works
registerLocaleData(localeIt, 'it-IT');

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'it-IT' }
  ]
}).catch(err => console.error(err));
