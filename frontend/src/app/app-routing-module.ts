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

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'flights', component: FlightsViewComponent }, // Pagina voli con filtri e ricerca
  { path: 'flights/:id/seats', component: SeatSelectionComponent }, // Selezione posti per un volo specifico
  { path: 'multi-segment-booking', component: MultiSegmentSeatsComponent }, // Prenotazione voli con scalo
  { path: 'checkout', component: CheckoutComponent }, // Pagina di checkout per finalizzare prenotazione
  { path: 'login', component: UserLoginComponent }, // Login unificato per tutti i tipi di utente
  { path: 'admin', component: AdminDashboardComponent }, // Pannello amministratore
  { path: 'register', component: UserRegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'bookings', component: BookingsComponent },
  { path: 'my-bookings', component: BookingsComponent }, // Alias per le prenotazioni utente
  { path: 'settings', component: SettingsComponent },
  { path: 'flight-admin', component: FlightAdminComponent, canActivate: [airlineGuard] }, // Pannello compagnie aeree
  { path: 'admin/flights', component: FlightAdminComponent },
  { path: 'routes', component: RouteAdminComponent, canActivate: [adminGuard] },
  { path: 'admin/routes', component: RouteAdminComponent, canActivate: [adminGuard] },
  { path: 'aircraft-admin', component: AircraftAdminComponent, canActivate: [airlineGuard] }, // Gestione aeromobili
  { path: 'admin/aircrafts', component: AircraftAdminComponent, canActivate: [adminGuard] },
  { path: 'airline-stats', component: AirlineStatsComponent, canActivate: [airlineGuard] },
  { path: '**', redirectTo: '' } // Redirect per tutte le altre rotte
];
