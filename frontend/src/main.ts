import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app/app-routing-module';
import { RouteAdminComponent } from './app/components/route-admin.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([
      ...routes,
      { path: 'routes', component: RouteAdminComponent },
      { path: 'admin/routes', component: RouteAdminComponent }
    ]),
    provideHttpClient()
  ]
}).catch(err => console.error(err));
