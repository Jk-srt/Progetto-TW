import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlightConnection, FlightConnectionService } from '../../services/flight-connection.service';

@Component({
  selector: 'app-flight-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flight-results" *ngIf="connections.length > 0">
      <div class="results-header">
        <h3>{{connections.length}} opzioni di volo trovate</h3>
        <div class="filter-tabs">
          <button 
            class="tab" 
            [class.active]="activeFilter === 'all'"
            (click)="setFilter('all')">
            Tutti ({{connections.length}})
          </button>
          <button 
            class="tab" 
            [class.active]="activeFilter === 'direct'"
            (click)="setFilter('direct')">
            Diretti ({{getDirectFlightsCount()}})
          </button>
          <button 
            class="tab" 
            [class.active]="activeFilter === 'connection'"
            (click)="setFilter('connection')">
            Con scalo ({{getConnectionFlightsCount()}})
          </button>
        </div>
      </div>

      <div class="flights-list">
        <div 
          class="flight-connection-card" 
          *ngFor="let connection of filteredConnections"
          [class.direct]="connection.isDirectFlight"
          [class.connection]="connection.isConnectionFlight">
          
          <!-- Header con prezzo e durata -->
          <div class="connection-header">
            <div class="price-info">
              <span class="price">€{{connection.totalPrice}}</span>
              <span class="price-label">per persona</span>
            </div>
            <div class="duration-info">
              <span class="duration">{{formatDuration(connection.totalDuration)}}</span>
              <span class="flight-type" *ngIf="connection.isDirectFlight">Diretto</span>
              <span class="flight-type" *ngIf="connection.isConnectionFlight">1 scalo</span>
            </div>
          </div>

          <!-- Volo diretto -->
          <div class="flight-segment" *ngIf="connection.isDirectFlight">
            <div class="flight-info">
              <div class="flight-number">
                <span class="code">{{connection.outboundFlight.flight_number}}</span>
                <span class="airline">{{connection.outboundFlight.airline_name}}</span>
              </div>
              
              <div class="route-visual">
                <div class="departure">
                  <span class="time">{{formatTime(connection.outboundFlight.departure_time)}}</span>
                  <span class="airport">{{connection.outboundFlight.departure_code}}</span>
                  <span class="city">{{connection.outboundFlight.departure_city}}</span>
                </div>
                
                <div class="route-line">
                  <div class="plane-icon">✈️</div>
                  <div class="duration">{{calculateSingleFlightDuration(connection.outboundFlight)}}</div>
                </div>
                
                <div class="arrival">
                  <span class="time">{{formatTime(connection.outboundFlight.arrival_time)}}</span>
                  <span class="airport">{{connection.outboundFlight.arrival_code}}</span>
                  <span class="city">{{connection.outboundFlight.arrival_city}}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Volo con scalo -->
          <div class="flight-segments" *ngIf="connection.isConnectionFlight">
            <!-- Primo segmento -->
            <div class="flight-segment">
              <div class="segment-label">Primo volo</div>
              <div class="flight-info">
                <div class="flight-number">
                  <span class="code">{{connection.outboundFlight.flight_number}}</span>
                  <span class="airline">{{connection.outboundFlight.airline_name}}</span>
                </div>
                
                <div class="route-visual">
                  <div class="departure">
                    <span class="time">{{formatTime(connection.outboundFlight.departure_time)}}</span>
                    <span class="airport">{{connection.outboundFlight.departure_code}}</span>
                    <span class="city">{{connection.outboundFlight.departure_city}}</span>
                  </div>
                  
                  <div class="route-line">
                    <div class="plane-icon">✈️</div>
                    <div class="duration">{{calculateSingleFlightDuration(connection.outboundFlight)}}</div>
                  </div>
                  
                  <div class="arrival">
                    <span class="time">{{formatTime(connection.outboundFlight.arrival_time)}}</span>
                    <span class="airport">{{connection.outboundFlight.arrival_code}}</span>
                    <span class="city">{{connection.outboundFlight.arrival_city}}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tempo di scalo -->
            <div class="connection-info" *ngIf="connection.connectionTime">
              <div class="connection-time">
                <span class="icon">⏱️</span>
                <span class="time">Scalo: {{formatConnectionTime(connection.connectionTime)}}</span>
                <span class="airport">{{connection.connectionAirport}}</span>
              </div>
            </div>

            <!-- Secondo segmento -->
            <div class="flight-segment" *ngIf="connection.connectionFlight">
              <div class="segment-label">Secondo volo</div>
              <div class="flight-info">
                <div class="flight-number">
                  <span class="code">{{connection.connectionFlight.flight_number}}</span>
                  <span class="airline">{{connection.connectionFlight.airline_name}}</span>
                </div>
                
                <div class="route-visual">
                  <div class="departure">
                    <span class="time">{{formatTime(connection.connectionFlight.departure_time)}}</span>
                    <span class="airport">{{connection.connectionFlight.departure_code}}</span>
                    <span class="city">{{connection.connectionFlight.departure_city}}</span>
                  </div>
                  
                  <div class="route-line">
                    <div class="plane-icon">✈️</div>
                    <div class="duration">{{calculateSingleFlightDuration(connection.connectionFlight)}}</div>
                  </div>
                  
                  <div class="arrival">
                    <span class="time">{{formatTime(connection.connectionFlight.arrival_time)}}</span>
                    <span class="airport">{{connection.connectionFlight.arrival_code}}</span>
                    <span class="city">{{connection.connectionFlight.arrival_city}}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer con azioni -->
          <div class="connection-footer">
            <div class="seats-info">
              <span class="available-seats">
                {{getMinAvailableSeats(connection)}} posti disponibili
              </span>
            </div>
            <button class="select-flight-btn" (click)="selectConnection(connection)">
              Seleziona Volo
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Messaggio quando non ci sono risultati -->
    <div class="no-results" *ngIf="connections.length === 0 && !isLoading">
      <div class="no-results-content">
        <span class="icon">✈️</span>
        <h3>Nessun volo trovato</h3>
        <p>Non sono stati trovati voli per i criteri di ricerca selezionati.</p>
        <p>Prova a modificare le date o considera aeroporti alternativi.</p>
      </div>
    </div>

    <!-- Stato di caricamento -->
    <div class="loading" *ngIf="isLoading">
      <div class="spinner"></div>
      <p>Ricerca voli in corso...</p>
      <small>Stiamo controllando voli diretti e con scalo...</small>
    </div>
  `,
  styleUrls: ['./flight-results.component.scss']
})
export class FlightResultsComponent {
  @Input() connections: FlightConnection[] = [];
  @Input() isLoading = false;
  @Output() flightSelected = new EventEmitter<FlightConnection>();

  activeFilter: 'all' | 'direct' | 'connection' = 'all';
  filteredConnections: FlightConnection[] = [];

  constructor(private flightConnectionService: FlightConnectionService) {}

  ngOnInit() {
    this.applyFilter();
  }

  ngOnChanges() {
    this.applyFilter();
  }

  setFilter(filter: 'all' | 'direct' | 'connection') {
    this.activeFilter = filter;
    this.applyFilter();
  }

  private applyFilter() {
    switch (this.activeFilter) {
      case 'direct':
        this.filteredConnections = this.connections.filter(c => c.isDirectFlight);
        break;
      case 'connection':
        this.filteredConnections = this.connections.filter(c => c.isConnectionFlight);
        break;
      default:
        this.filteredConnections = [...this.connections];
    }
  }

  getDirectFlightsCount(): number {
    return this.connections.filter(c => c.isDirectFlight).length;
  }

  getConnectionFlightsCount(): number {
    return this.connections.filter(c => c.isConnectionFlight).length;
  }

  formatDuration(minutes: number): string {
    return this.flightConnectionService.formatDuration(minutes);
  }

  formatConnectionTime(minutes: number): string {
    return this.flightConnectionService.formatConnectionTime(minutes);
  }

  formatTime(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  calculateSingleFlightDuration(flight: any): string {
    if (!flight.departure_time || !flight.arrival_time) return 'N/A';
    
    const departure = new Date(flight.departure_time);
    const arrival = new Date(flight.arrival_time);
    const durationMs = arrival.getTime() - departure.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    
    return this.formatDuration(durationMinutes);
  }

  getMinAvailableSeats(connection: FlightConnection): number {
    if (connection.isDirectFlight) {
      return connection.outboundFlight.available_seats || 0;
    } else if (connection.connectionFlight) {
      // Per i voli con scalo, prendi il minimo tra i due voli
      const firstFlightSeats = connection.outboundFlight.available_seats || 0;
      const secondFlightSeats = connection.connectionFlight.available_seats || 0;
      return Math.min(firstFlightSeats, secondFlightSeats);
    }
    return 0;
  }

  selectConnection(connection: FlightConnection) {
    this.flightSelected.emit(connection);
  }
}
