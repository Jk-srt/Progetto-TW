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
import { routeAccessGuard } from './guards/route-access.guard';
import { notAdminGuard } from './guards/not-admin.guard';

// Merged routes: keep mustChangePasswordGuard baseline + role guards + routeAccessGuard where appropriate
export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'flights', component: FlightsViewComponent, canActivate: [mustChangePasswordGuard, notAdminGuard] },
  { path: 'flights/:id/seats', component: SeatSelectionComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'multi-segment-booking', component: MultiSegmentSeatsComponent, canActivate: [mustChangePasswordGuard, notAdminGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [mustChangePasswordGuard, notAdminGuard] },
  { path: 'login', component: UserLoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [mustChangePasswordGuard, adminGuard] },
  { path: 'register', component: UserRegisterComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'bookings', component: BookingsComponent, canActivate: [mustChangePasswordGuard, notAdminGuard] },
  { path: 'my-bookings', component: BookingsComponent, canActivate: [mustChangePasswordGuard, notAdminGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [mustChangePasswordGuard] },
  { path: 'flight-admin', component: FlightAdminComponent, canActivate: [mustChangePasswordGuard, airlineGuard, notAdminGuard] },
  { path: 'routes', component: RouteAdminComponent, canActivate: [mustChangePasswordGuard, routeAccessGuard, notAdminGuard] },
  { path: 'aircraft-admin', component: AircraftAdminComponent, canActivate: [mustChangePasswordGuard, airlineGuard, notAdminGuard] },
  { path: 'airline-stats', component: AirlineStatsComponent, canActivate: [mustChangePasswordGuard, airlineGuard, notAdminGuard] },
  { path: '**', redirectTo: '' }
];
