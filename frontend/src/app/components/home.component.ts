import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalFlightsService } from '../services/global-flights.service';
import { FlightsGridComponent } from './flights-grid/flights-grid.component';
import { WelcomeSectionComponent } from './welcome-section/welcome-section.component';
import { StatsSectionComponent, StatCard } from './stats-section/stats-section.component';
import { FlightSearchComponent, FlightSearchCriteria } from './flight-search/flight-search.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FlightsGridComponent,
    WelcomeSectionComponent,
    StatsSectionComponent,
    FlightSearchComponent
  ],
  template: `
    <div class="home-container">
      <!-- Sezione benvenuto -->
      <app-welcome-section></app-welcome-section>

      <!-- Ricerca voli -->
      <app-flight-search (searchRequested)="onFlightSearch($event)"></app-flight-search>

      <!-- Statistiche rapide -->
      <app-stats-section [stats]="stats"></app-stats-section>

      <!-- Sezione voli -->
      <div class="flights-section">
        <div class="section-header">
          <h2>Voli Disponibili</h2>
          <p class="flights-count">{{getTodaysFlightsCount()}} voli oggi di {{flights.length}} totali</p>
        </div>
        <app-flights-grid [flights]="filteredFlights"></app-flights-grid>
      </div>
    </div>
  `,
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  flights: any[] = [];
  filteredFlights: any[] = [];
  stats: StatCard[] = [];
  isInitialized = false;
  
  globalFlights = inject(GlobalFlightsService);

  constructor() {
    console.log('🏠 HomeComponent: Constructor called');
  }

  ngOnInit() {
    console.log('🏠 HomeComponent: ngOnInit called');
    this.isInitialized = true;
    
    // Sottoscrizione ai flights globali
    this.globalFlights.flights$.subscribe((flights: any[]) => {
      console.log('🏠 HomeComponent: Received flights:', flights.length);
      this.flights = flights;
      this.filteredFlights = flights; // Inizialmente mostra tutti i voli
      this.updateStats();
    });
    
    // Carica i voli
    this.loadFlights();
  }

  private loadFlights() {
    this.globalFlights.loadFlightsGlobally()
      .catch(error => {
        console.error('Error loading flights:', error);
      });
  }

  private updateStats() {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Filtra voli di oggi (confronta solo la data, non l'ora)
    const todaysFlights = this.flights.filter(flight => {
      if (!flight.departure_time) return false;
      const flightDate = new Date(flight.departure_time).toISOString().split('T')[0];
      return flightDate === todayString;
    });

    this.stats = [
      {
        icon: '🛫',
        number: todaysFlights.length,
        label: 'Voli Oggi'
      },
      {
        icon: '✈️',
        number: this.flights.filter(f => f.status === 'scheduled').length,
        label: 'Voli Attivi'
      },
      {
        icon: '⏰',
        number: this.flights.filter(f => f.status === 'scheduled').length,
        label: 'In Orario'
      }
    ];
  }

  getTodaysFlightsCount(): number {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return this.flights.filter(flight => {
      if (!flight.departure_time) return false;
      const flightDate = new Date(flight.departure_time).toISOString().split('T')[0];
      return flightDate === todayString;
    }).length;
  }

  onFlightSearch(criteria: FlightSearchCriteria): void {
    console.log('Ricerca voli con criteri:', criteria);
    
    // Filtra i voli in base ai criteri di ricerca
    this.filteredFlights = this.flights.filter(flight => {
      let matches = true;

      // Filtra per aeroporto di partenza
      if (criteria.departure && flight.departure_airport !== criteria.departure) {
        matches = false;
      }

      // Filtra per aeroporto di arrivo
      if (criteria.arrival && flight.arrival_airport !== criteria.arrival) {
        matches = false;
      }

      // Filtra per data di partenza
      if (criteria.departureDate) {
        const flightDate = new Date(flight.departure_time).toISOString().split('T')[0];
        if (flightDate !== criteria.departureDate) {
          matches = false;
        }
      }

      return matches;
    });

    console.log(`Trovati ${this.filteredFlights.length} voli che corrispondono ai criteri`);
  }
}
