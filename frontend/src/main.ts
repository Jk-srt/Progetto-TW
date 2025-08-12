import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app/app-routing-module';
import { RouteAdminComponent } from './app/components/route-admin.component';
import { authInterceptor } from './app/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([
      ...routes,
      { path: 'routes', component: RouteAdminComponent },
      { path: 'admin/routes', component: RouteAdminComponent }
    ]),
  provideHttpClient(withInterceptors([authInterceptor]))
  ]
}).catch(err => console.error(err));
