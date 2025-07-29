import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { FlightsViewComponent } from './components/flights-view.component';
import { UserLoginComponent } from './components/user-login.component';
import { UserRegisterComponent } from './components/user-register.component';
// import { ProfileComponent } from './components/profile.component'; // Temporarily disabled
import { BookingsComponent } from './components/bookings.component';
import { SettingsComponent } from './components/settings.component';
import { FlightAdminComponent } from './components/flight-admin.component';
import { AirlineLoginComponent } from './components/airline-login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'flights', component: FlightsViewComponent },
  { path: 'login', component: UserLoginComponent },
  { path: 'airline-login', component: AirlineLoginComponent }, // Login per compagnie aeree
  { path: 'register', component: UserRegisterComponent },
  // { path: 'profile', component: ProfileComponent },
  { path: 'bookings', component: BookingsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'flight-admin', component: FlightAdminComponent },
  { path: 'admin/flights', component: FlightAdminComponent },
  { path: '**', redirectTo: '' } // Redirect per tutte le altre rotte
];
