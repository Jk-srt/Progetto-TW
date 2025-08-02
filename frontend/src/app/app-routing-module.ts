import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { FlightsViewComponent } from './components/flights-view.component';
import { UserLoginComponent } from './components/user-login.component';
import { UserRegisterComponent } from './components/user-register.component';
import { ProfileComponent } from './components/profile.component';
import { BookingsComponent } from './components/bookings.component';
import { SettingsComponent } from './components/settings.component';
import { FlightAdminComponent } from './components/flight-admin.component';
import { AdminDashboardComponent } from './components/admin-dashboard.component';
import { RouteAdminComponent } from './components/route-admin.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'flights', component: FlightsViewComponent },
  { path: 'login', component: UserLoginComponent }, // Login unificato per tutti i tipi di utente
  { path: 'admin', component: AdminDashboardComponent }, // Pannello amministratore
  { path: 'register', component: UserRegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'bookings', component: BookingsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'flight-admin', component: FlightAdminComponent }, // Pannello compagnie aeree
  { path: 'admin/flights', component: FlightAdminComponent },
  { path: 'routes', component: RouteAdminComponent },
  { path: 'admin/routes', component: RouteAdminComponent },
  { path: '**', redirectTo: '' } // Redirect per tutte le altre rotte
];
