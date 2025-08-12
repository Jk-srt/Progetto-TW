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
import { AircraftAdminComponent } from './components/aircraft-admin.component';
import { SeatSelectionComponent } from './components/seat-selection/seat-selection.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { MultiSegmentSeatsComponent } from './components/multi-segment-seats/multi-segment-seats.component';
import { AirlineStatsComponent } from './components/airline-stats.component';
import { airlineGuard } from './guards/airline.guard';
import { adminGuard } from './guards/admin.guard';
import { mustChangePasswordGuard } from './guards/must-change-password.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'flights', component: FlightsViewComponent, canActivate: [mustChangePasswordGuard] }, // Pagina voli con filtri e ricerca
  { path: 'flights/:id/seats', component: SeatSelectionComponent, canActivate: [mustChangePasswordGuard] }, // Selezione posti per un volo specifico
  { path: 'multi-segment-booking', component: MultiSegmentSeatsComponent, canActivate: [mustChangePasswordGuard] }, // Prenotazione voli con scalo
  { path: 'checkout', component: CheckoutComponent, canActivate: [mustChangePasswordGuard] }, // Pagina di checkout per finalizzare prenotazione
  { path: 'login', component: UserLoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [mustChangePasswordGuard, adminGuard] }, // Pannello amministratore
  { path: 'register', component: UserRegisterComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'bookings', component: BookingsComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'my-bookings', component: BookingsComponent, canActivate: [mustChangePasswordGuard] }, // Alias per le prenotazioni utente
  { path: 'settings', component: SettingsComponent },
  { path: 'flight-admin', component: FlightAdminComponent, canActivate: [mustChangePasswordGuard, airlineGuard] }, // Pannello compagnie aeree
  { path: 'admin/flights', component: FlightAdminComponent, canActivate: [mustChangePasswordGuard, adminGuard] },
  { path: 'routes', component: RouteAdminComponent, canActivate: [mustChangePasswordGuard, adminGuard] },
  { path: 'admin/routes', component: RouteAdminComponent, canActivate: [mustChangePasswordGuard, adminGuard] },
  { path: 'aircraft-admin', component: AircraftAdminComponent, canActivate: [mustChangePasswordGuard, airlineGuard] }, // Gestione aeromobili
  { path: 'admin/aircrafts', component: AircraftAdminComponent, canActivate: [mustChangePasswordGuard, adminGuard] },
  { path: 'airline-stats', component: AirlineStatsComponent, canActivate: [mustChangePasswordGuard, airlineGuard] },
  { path: '**', redirectTo: '' } // Redirect per tutte le altre rotte
];
