import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', loadComponent: () => import('./components/flight-search.component').then(m => m.FlightSearchComponent) },
  { path: 'purchase', loadComponent: () => import('./components/ticket-purchase.component').then(m => m.TicketPurchaseComponent) },
  { path: 'login', loadComponent: () => import('./components/user-login.component').then(m => m.UserLoginComponent) },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
