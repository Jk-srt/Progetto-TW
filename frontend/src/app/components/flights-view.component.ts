import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FlightService } from '../services/flight.service';
import { Flight } from '../models/flight.model';

@Component({
  selector: 'app-flights-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="flights-view-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <h1>🛫 Voli Disponibili</h1>
          <p class="subtitle">Esplora i voli delle migliori compagnie aeree</p>
          
          <div class="user-status" *ngIf="!isLoggedIn">
            <div class="guest-info">
              <span class="guest-badge">👤 Ospite</span>
              <p>Effettua il login come compagnia aerea per gestire i voli</p>
              <div class="quick-actions">
                <button class="btn btn-outline" routerLink="/login">
                  Accedi
                </button>
                <button class="btn btn-primary" (click)="showDemoInfo = !showDemoInfo">
                  Demo Compagnie
                </button>
              </div>
            </div>
          </div>

          <div class="demo-info" *ngIf="showDemoInfo && !isLoggedIn">
            <h3>🏢 Compagnie Aeree Registrate</h3>
            <div class="airlines-grid">
              <div class="airline-card" *ngFor="let airline of registeredAirlines">
                <div class="airline-header">
                  <span class="airline-name">{{airline.airline_name}}</span>
                  <span class="airline-email">{{airline.email}}</span>
                </div>
                <button 
                  class="btn btn-sm btn-secondary" 
                  (click)="simulateLogin(airline.airline_name!)">
                  Accedi come {{airline.airline_name}}
                </button>
              </div>
            </div>
            <p class="demo-note">
              <strong>Demo:</strong> Password per tutte le compagnie: <code>password123</code>
            </p>
          </div>

          <div class="user-status" *ngIf="isLoggedIn && currentUser">
            <div class="airline-info">
              <span class="airline-badge">✈️ {{currentUser.airline_name || currentUser.first_name}}</span>
              <span class="role-badge">{{getRoleLabel(currentUser.role)}}</span>
              <div class="quick-actions">
                <button 
                  class="btn btn-primary" 
                  routerLink="/flight-admin"
                  *ngIf="currentUser.role === 'airline'">
                  Gestisci Voli
                </button>
                <button class="btn btn-secondary" (click)="logout()">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtri -->
      <div class="filters-section" *ngIf="flights.length > 0">
        <div class="filters">
          <div class="filter-group">
            <label>Origine</label>
            <select [(ngModel)]="filters.origin" (change)="applyFilters()">
              <option value="">Tutte le città</option>
              <option *ngFor="let city of originCities" [value]="city">{{city}}</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Destinazione</label>
            <select [(ngModel)]="filters.destination" (change)="applyFilters()">
              <option value="">Tutte le città</option>
              <option *ngFor="let city of destinationCities" [value]="city">{{city}}</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Compagnia</label>
            <select [(ngModel)]="filters.airline" (change)="applyFilters()">
              <option value="">Tutte le compagnie</option>
              <option *ngFor="let airline of airlines" [value]="airline">{{airline}}</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Stato</label>
            <select [(ngModel)]="filters.status" (change)="applyFilters()">
              <option value="">Tutti gli stati</option>
              <option value="scheduled">Programmato</option>
              <option value="delayed">Ritardato</option>
              <option value="cancelled">Cancellato</option>
              <option value="completed">Completato</option>
            </select>
          </div>

          <div class="filter-group">
            <button class="btn btn-secondary" (click)="clearFilters()">
              Pulisci Filtri
            </button>
          </div>
        </div>
      </div>

      <!-- Lista Voli -->
      <div class="flights-container">
        <div class="loading" *ngIf="loading">
          <div class="spinner"></div>
          <p>Caricamento voli...</p>
        </div>

        <div class="no-flights" *ngIf="!loading && filteredFlights.length === 0">
          <div class="no-flights-content">
            <span class="no-flights-icon">✈️</span>
            <h3>Nessun volo trovato</h3>
            <p *ngIf="hasActiveFilters()">Prova a modificare i filtri di ricerca</p>
            <p *ngIf="!hasActiveFilters()">Non ci sono voli disponibili al momento</p>
          </div>
        </div>

        <div class="flights-grid" *ngIf="!loading && filteredFlights.length > 0">
          <div class="flight-card" *ngFor="let flight of filteredFlights">
            <div class="flight-header">
              <div class="flight-number">
                <span class="flight-code">{{flight.flight_number}}</span>
                <span class="airline-name">{{flight.airline_name}}</span>
              </div>
              <div class="flight-status">
                <span class="status" [class]="'status-' + flight.status">
                  {{getStatusLabel(flight.status)}}
                </span>
              </div>
            </div>

            <div class="flight-route">
              <div class="route-info">
                <div class="departure">
                  <span class="time">{{formatTime(flight.departure_time)}}</span>
                  <span class="airport">{{flight.departure_airport}}</span>
                  <span class="city">{{flight.departure_city}}</span>
                </div>
                
                <div class="route-visual">
                  <div class="route-line">
                    <span class="plane-icon">✈️</span>
                  </div>
                  <span class="duration">{{calculateDuration(flight.departure_time, flight.arrival_time)}}</span>
                </div>

                <div class="arrival">
                  <span class="time">{{formatTime(flight.arrival_time)}}</span>
                  <span class="airport">{{flight.arrival_airport}}</span>
                  <span class="city">{{flight.arrival_city}}</span>
                </div>
              </div>
            </div>

            <div class="flight-details">
              <div class="aircraft-info">
                <span class="aircraft">🛩️ {{flight.aircraft_model}}</span>
              </div>
              
              <div class="seats-info">
                <span class="available-seats">
                  {{flight.available_seats}}/{{flight.total_seats}} posti disponibili
                </span>
                <div class="seats-bar">
                  <div 
                    class="seats-fill" 
                    [style.width.%]="flight.available_seats && flight.total_seats ? 
                      (flight.available_seats / flight.total_seats) * 100 : 0">
                  </div>
                </div>
              </div>

              <div class="price-info">
                <span class="price">€{{flight.price}}</span>
                <span class="price-label">per persona</span>
              </div>
            </div>

            <div class="flight-actions" *ngIf="isLoggedIn && currentUser?.role === 'airline'">
              <button 
                class="btn btn-sm btn-outline"
                *ngIf="canManageFlight(flight)"
                routerLink="/flight-admin">
                Gestisci Volo
              </button>
              <span 
                class="no-permission"
                *ngIf="!canManageFlight(flight)"
                title="Puoi gestire solo i voli della tua compagnia">
                🔒 Solo {{flight.airline_name}}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Footer -->
      <div class="stats-footer" *ngIf="!loading && flights.length > 0">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">{{flights.length}}</span>
            <span class="stat-label">Voli Totali</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{getActiveFlights()}}</span>
            <span class="stat-label">Voli Attivi</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{getUniqueAirlines()}}</span>
            <span class="stat-label">Compagnie</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{getUniqueDestinations()}}</span>
            <span class="stat-label">Destinazioni</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./flights-view.component.scss']
})
export class FlightsViewComponent implements OnInit {
  flights: Flight[] = [];
  filteredFlights: Flight[] = [];
  loading = false;
  showDemoInfo = false;
  
  // Filtri
  filters = {
    origin: '',
    destination: '',
    airline: '',
    status: ''
  };

  // Per i dropdown dei filtri
  originCities: string[] = [];
  destinationCities: string[] = [];
  airlines: string[] = [];

  // Utente corrente
  currentUser: any = null;
  isLoggedIn = false;
  registeredAirlines: any[] = [];

  constructor(
    private flightService: FlightService
  ) {}

  ngOnInit() {
    this.loadUserState();
    this.loadFlights();
    this.loadRegisteredAirlines();
  }

  private loadUserState() {
    // Check localStorage for auth state
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        this.currentUser = JSON.parse(user);
        this.isLoggedIn = true;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }

  private loadRegisteredAirlines() {
    this.registeredAirlines = [
      { name: 'Alitalia', email: 'admin@alitalia.com' },
      { name: 'Lufthansa', email: 'admin@lufthansa.com' },
      { name: 'Air France', email: 'admin@airfrance.com' },
      { name: 'Emirates', email: 'admin@emirates.com' }
    ];
  }

  private loadFlights() {
    this.loading = true;
    this.flightService.getFlights().subscribe({
      next: (flights) => {
        this.flights = flights;
        this.filteredFlights = [...flights];
        this.extractFilterOptions();
        this.loading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento voli:', error);
        this.loading = false;
      }
    });
  }

  private extractFilterOptions() {
    this.originCities = [...new Set(this.flights.map(f => f.departure_city).filter(Boolean))] as string[];
    this.originCities.sort();
    this.destinationCities = [...new Set(this.flights.map(f => f.arrival_city).filter(Boolean))] as string[];
    this.destinationCities.sort();
    this.airlines = [...new Set(this.flights.map(f => f.airline_name).filter(Boolean))] as string[];
    this.airlines.sort();
  }

  applyFilters() {
    this.filteredFlights = this.flights.filter(flight => {
      return (!this.filters.origin || flight.departure_city === this.filters.origin) &&
             (!this.filters.destination || flight.arrival_city === this.filters.destination) &&
             (!this.filters.airline || flight.airline_name === this.filters.airline) &&
             (!this.filters.status || flight.status === this.filters.status);
    });
  }

  clearFilters() {
    this.filters = {
      origin: '',
      destination: '',
      airline: '',
      status: ''
    };
    this.filteredFlights = [...this.flights];
  }

  hasActiveFilters(): boolean {
    return Object.values(this.filters).some(filter => filter !== '');
  }

  simulateLogin(airlineName: string) {
    // Redirect to airline login page
    window.location.href = '/airline-login';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn = false;
    this.currentUser = null;
    window.location.reload();
  }

  canManageFlight(flight: Flight): boolean {
    if (!this.currentUser || this.currentUser.role !== 'airline') {
      return false;
    }
    return flight.airline_id === this.currentUser.airline_id;
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'user': 'Utente',
      'airline': 'Compagnia Aerea',
      'admin': 'Amministratore'
    };
    return labels[role] || role;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'scheduled': 'Programmato',
      'delayed': 'Ritardato',
      'cancelled': 'Cancellato',
      'completed': 'Completato'
    };
    return labels[status] || status;
  }

  formatTime(timeString: string | undefined): string {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  }

  calculateDuration(departure: string | undefined, arrival: string | undefined): string {
    if (!departure || !arrival) return 'N/A';
    try {
      const dep = new Date(departure);
      const arr = new Date(arrival);
      const diffMs = arr.getTime() - dep.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch {
      return 'N/A';
    }
  }

  getActiveFlights(): number {
    return this.flights.filter(f => f.status === 'scheduled' || f.status === 'delayed').length;
  }

  getUniqueAirlines(): number {
    return new Set(this.flights.map(f => f.airline_name)).size;
  }

  getUniqueDestinations(): number {
    return new Set(this.flights.map(f => f.arrival_city)).size;
  }
}
