import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GlobalFlightsService } from '../services/global-flights.service';
import { FlightConnectionService, FlightConnection } from '../services/flight-connection.service';
import { FlightsGridComponent } from './flights-grid/flights-grid.component';
import { WelcomeSectionComponent } from './welcome-section/welcome-section.component';
import { StatsSectionComponent, StatCard } from './stats-section/stats-section.component';
import { FlightSearchComponent, FlightSearchCriteria } from './flight-search/flight-search.component';
import { FlightResultsComponent } from './flight-results/flight-results.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FlightsGridComponent,
    WelcomeSectionComponent,
    StatsSectionComponent,
    FlightSearchComponent,
    FlightResultsComponent
  ],
  template: `
    <div class="home-container">
      <!-- Sezione benvenuto -->
      <app-welcome-section></app-welcome-section>

      <!-- Ricerca voli -->
      <app-flight-search 
        (searchRequested)="onFlightSearch($event)"
        (resetRequested)="resetSearch()"></app-flight-search>

      <!-- Risultati ricerca voli con scali -->
      <app-flight-results 
        [connections]="searchResults" 
        [isLoading]="isSearching"
        (flightSelected)="onFlightSelected($event)"
        *ngIf="hasSearched"></app-flight-results>

      <!-- Statistiche rapide -->
      <app-stats-section [stats]="stats" *ngIf="!hasSearched"></app-stats-section>

      <!-- Sezione voli (mostra solo se non si sta facendo una ricerca specifica) -->
      <div class="flights-section" *ngIf="!hasSearched">
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
  
  // Nuove proprietà per la ricerca con scali
  searchResults: FlightConnection[] = [];
  isSearching = false;
  hasSearched = false;
  
  globalFlights = inject(GlobalFlightsService);

  constructor(
    private flightConnectionService: FlightConnectionService,
    private router: Router
  ) {
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
    console.log('🔍 Ricerca voli con criteri:', criteria);
    
    this.hasSearched = true;
    this.isSearching = true;
    this.searchResults = [];

    // Converti i criteri di ricerca nel formato richiesto dal servizio
    const searchRequest = {
      departure_city: this.extractCityFromAirport(criteria.departure),
      arrival_city: this.extractCityFromAirport(criteria.arrival), 
      departure_date: criteria.departureDate,
      return_date: criteria.returnDate,
      passengers: criteria.passengers,
      max_connections: 1 // Permetti fino a 1 scalo
    };

    this.flightConnectionService.searchFlights(searchRequest).subscribe({
      next: (connections: FlightConnection[]) => {
        console.log('✅ Ricerca completata:', connections.length, 'opzioni trovate');
        this.searchResults = connections;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('❌ Errore nella ricerca voli:', error);
        this.isSearching = false;
        // Fallback alla ricerca locale
        this.performLocalSearch(criteria);
      }
    });
  }

  /**
   * Estrae il nome dell'aeroporto senza parentesi dal formato "Roma Fiumicino (FCO)"
   * Ora invia il nome completo dell'aeroporto invece di solo la città
   */
  private extractCityFromAirport(airportString: string): string {
    if (!airportString) return '';
    
    // Se il formato è "Roma Fiumicino (FCO)", estrai "Roma Fiumicino"
    const match = airportString.match(/^([^(]+)/);
    if (match) {
      return match[1].trim(); // Restituisce tutto prima della parentesi, non solo la prima parola
    }
    
    return airportString;
  }

  /**
   * Fallback per la ricerca locale quando l'API non funziona
   */
  private performLocalSearch(criteria: FlightSearchCriteria): void {
    console.log('🔄 Fallback alla ricerca locale');
    
    // Filtra i voli in base ai criteri di ricerca (ricerca legacy)
    this.filteredFlights = this.flights.filter(flight => {
      let matches = true;

      // Filtra per aeroporto di partenza
      if (criteria.departure && !flight.departure_airport?.includes(this.extractCityFromAirport(criteria.departure))) {
        matches = false;
      }

      // Filtra per aeroporto di arrivo
      if (criteria.arrival && !flight.arrival_airport?.includes(this.extractCityFromAirport(criteria.arrival))) {
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

    // Converti i voli filtrati in FlightConnection per compatibilità
    this.searchResults = this.filteredFlights.map(flight => ({
      id: flight.id?.toString() || 'unknown',
      outboundFlight: flight,
      totalDuration: this.calculateFlightDuration(flight),
      totalPrice: this.getFlightPrice(flight),
      isDirectFlight: true,
      isConnectionFlight: false
    }));

    console.log(`📝 Trovati ${this.searchResults.length} voli nella ricerca locale`);
  }

  private calculateFlightDuration(flight: any): number {
    if (!flight.departure_time || !flight.arrival_time) return 0;
    
    const departure = new Date(flight.departure_time);
    const arrival = new Date(flight.arrival_time);
    return (arrival.getTime() - departure.getTime()) / (1000 * 60); // in minuti
  }

  private getFlightPrice(flight: any): number {
    const prices = [];
    
    if (flight.economy_price && flight.economy_price > 0) {
      prices.push(flight.economy_price);
    }
    if (flight.business_price && flight.business_price > 0) {
      prices.push(flight.business_price);
    }
    if (flight.first_price && flight.first_price > 0) {
      prices.push(flight.first_price);
    }
    
    return prices.length > 0 ? Math.min(...prices) : 0;
  }

  onFlightSelected(connection: FlightConnection): void {
    const timestamp = new Date().toISOString();
    console.log('✈️ [' + timestamp + '] Volo selezionato:', connection);
    console.log('🔍 isDirectFlight:', connection.isDirectFlight);
    console.log('🔍 Flight ID:', connection.outboundFlight?.id);
    
    if (connection.isDirectFlight) {
      // Naviga alla selezione posti per volo diretto
      console.log('🎯 [NAVIGATION] Navigazione alla selezione posti per volo ID:', connection.outboundFlight.id);
      const navigationPromise = this.router.navigate(['/flights', connection.outboundFlight.id, 'seats']);
      navigationPromise.then(
        (success) => console.log('✅ [SUCCESS] Navigazione riuscita:', success),
        (error) => console.error('❌ [ERROR] Errore navigazione:', error)
      );
    } else if (connection.isConnectionFlight) {
      // Naviga alla prenotazione multi-segmento per voli con scalo
      console.log('🔗 [INFO] Volo con scalo selezionato - implementazione futura');
      console.log('Flight 1:', connection.outboundFlight.flight_number);
      console.log('Flight 2:', connection.connectionFlight?.flight_number);
    }
  }

  /**
   * Reset della ricerca per tornare alla vista iniziale
   */
  resetSearch(): void {
    this.hasSearched = false;
    this.isSearching = false;
    this.searchResults = [];
    this.filteredFlights = this.flights; // Ripristina tutti i voli
  }
}
