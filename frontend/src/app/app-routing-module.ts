import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { UserLoginComponent } from './components/user-login.component';
import { UserRegisterComponent } from './components/user-register.component';
import { ProfileComponent } from './components/profile.component';
import { BookingsComponent } from './components/bookings.component';
import { SettingsComponent } from './components/settings.component';
import { FlightAdminComponent } from './components/flight-admin.component';
import { AdminDashboardComponent } from './components/admin-dashboard.component';
import { RouteAdminComponent } from './components/route-admin.component';
import { AircraftAdminComponent } from './components/aircraft-admin.component';
import { SeatSelectionComponent } from './components/seat-selection/seat-selection.component';
import { CheckoutComponent } from './components/checkout/checkout.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'flights/:id/seats', component: SeatSelectionComponent }, // Selezione posti per un volo specifico
  { path: 'checkout', component: CheckoutComponent }, // Pagina di checkout per finalizzare prenotazione
  { path: 'login', component: UserLoginComponent }, // Login unificato per tutti i tipi di utente
  { path: 'admin', component: AdminDashboardComponent }, // Pannello amministratore
  { path: 'register', component: UserRegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'bookings', component: BookingsComponent },
  { path: 'my-bookings', component: BookingsComponent }, // Alias per le prenotazioni utente
  { path: 'settings', component: SettingsComponent },
  { path: 'flight-admin', component: FlightAdminComponent }, // Pannello compagnie aeree
  { path: 'admin/flights', component: FlightAdminComponent },
  { path: 'routes', component: RouteAdminComponent },
  { path: 'admin/routes', component: RouteAdminComponent },
  { path: 'aircraft-admin', component: AircraftAdminComponent }, // Gestione aeromobili
  { path: 'admin/aircrafts', component: AircraftAdminComponent },
  { path: '**', redirectTo: '' } // Redirect per tutte le altre rotte
];
