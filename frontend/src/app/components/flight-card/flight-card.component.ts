import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Flight } from '../../models/flight.model';
import { AirportService } from '../../services/airport.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-flight-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flight-card" [ngClass]="flight.status?.toLowerCase()">
      <div class="flight-header">
        <div class="flight-info">
          <div class="flight-number">Volo {{flight.flight_number}}</div>
          <div class="airline-name">{{flight.airline || 'N/A'}}</div>
        </div>
        <div class="status-badge" [style.background]="getStatusColor()">
          {{getStatusLabel()}}
        </div>
      </div>

      <div class="flight-route">
        <div class="airport">
          <div class="airport-code">{{getAirportCode(flight.departure_airport)}}</div>
          <div class="airport-name">{{flight.departure_airport}}</div>
          <div class="city-name">{{flight.departure_city || 'N/A'}}</div>
          <div class="time">{{formatTime(flight.departure_time)}}</div>
        </div>
        <div class="route-line">
          <div class="airplane-icon">✈️</div>
        </div>
        <div class="airport">
          <div class="airport-code">{{getAirportCode(flight.arrival_airport)}}</div>
          <div class="airport-name">{{flight.arrival_airport}}</div>
          <div class="city-name">{{flight.arrival_city || 'N/A'}}</div>
          <div class="time">{{formatTime(flight.arrival_time)}}</div>
        </div>
      </div>

      <div class="flight-details">
        <div class="flight-date">{{formatDate(flight.departure_time)}}</div>
        <div class="price-and-book">
          <div class="pricing-info">
            <div class="price">€{{formatPrice(getEconomyTotal())}}</div>
            <div class="price-label">Economy (totale)</div>
            <div class="sub-price">
              <small>
                Base €{{formatPrice(getEconomyBase())}}
                <span *ngIf="(flight.flight_surcharge||0) > 0"> + Surch. €{{formatPrice(flight.flight_surcharge)}}</span>
              </small>
            </div>
            <div class="sub-price" *ngIf="flight.business_price && flight.business_price > 0">
              <small>Business €{{formatPrice(flight.business_price)}}</small>
            </div>
          </div>
          <button *ngIf="!isFlightUnavailable() && !isAirlineUser && !isAdminUser()" (click)="bookFlight()" class="book-btn">
            Prenota
          </button>
          <div *ngIf="isFlightUnavailable()" class="unavailable-badge">
            Non Disponibile
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './flight-card.component.scss'
})
export class FlightCardComponent implements OnInit {
  @Input() flight!: any;
  private airportCodes: { [key: string]: string } = {};
  isAirlineUser = false;
  private currentUser: any = null;

  constructor(
    private router: Router,
  private airportService: AirportService,
  private authService: AuthService
  ) {}

  ngOnInit(): void {
  // Rileva ruolo utente (nascondi prenotazione se airline)
  const user = this.authService.getCurrentUser();
  this.currentUser = user;
  this.isAirlineUser = user?.role === 'airline';
  this.authService.currentUser$.subscribe(u => {
    this.currentUser = u;
    this.isAirlineUser = (u?.role === 'airline');
  });
    // Carica i codici degli aeroporti per questo volo
    this.loadAirportCodes();
  }

  isAdminUser(): boolean {
    return this.currentUser?.role === 'admin';
  }

  private loadAirportCodes(): void {
    if (this.flight.departure_airport) {
      this.airportService.getIataCodeByName(this.flight.departure_airport).subscribe({
        next: (code) => {
          this.airportCodes[this.flight.departure_airport] = code;
        },
        error: (error) => {
          console.error('Errore nel caricamento codice aeroporto partenza:', error);
        }
      });
    }

    if (this.flight.arrival_airport) {
      this.airportService.getIataCodeByName(this.flight.arrival_airport).subscribe({
        next: (code) => {
          this.airportCodes[this.flight.arrival_airport] = code;
        },
        error: (error) => {
          console.error('Errore nel caricamento codice aeroporto arrivo:', error);
        }
      });
    }
  }

  getAirportCode(airportName: string): string {
    if (!airportName) return 'N/A';
    
    // Restituisce il codice caricato dinamicamente o un fallback temporaneo
    return this.airportCodes[airportName] || airportName.substring(0, 3).toUpperCase();
  }

  getStatusClass(status: string): string {
    if (!status) return '';
    return 'status-' + status.toLowerCase().replace(' ', '-');
  }

  formatTime(dateTime: string): string {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDate(dateTime: string): string {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDuration(duration: string): string {
    if (!duration) return 'N/A';
    
    // Assumiamo che duration sia in formato "HH:MM:SS"
    const parts = duration.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      return `${hours}h ${minutes}m`;
    }
    return duration;
  }

  // Metodo per ottenere il prezzo più basso tra le classi disponibili
  getLowestPrice(): number {
    const prices = [];
    
    // Aggiungi i prezzi delle varie classi se disponibili
    if (this.flight.economy_price && this.flight.economy_price > 0) {
      prices.push(this.flight.economy_price);
    }
    if (this.flight.business_price && this.flight.business_price > 0) {
      prices.push(this.flight.business_price);
    }
    if (this.flight.first_price && this.flight.first_price > 0) {
      prices.push(this.flight.first_price);
    }
    
    // Se non ci sono prezzi delle classi, usa il prezzo vecchio come fallback
    if (prices.length === 0) {
      return this.flight.price || 0;
    }
    
    return Math.min(...prices);
  }

  getEconomyBase(): number {
    if (this.flight && this.flight.economy_base_price !== undefined && this.flight.economy_base_price !== null) {
      return this.flight.economy_base_price;
    }
    // fallback: se abbiamo economy_price e surcharge separati
    if (this.flight && this.flight.economy_price !== undefined) {
      const base = (this.flight.economy_price || 0) - (this.flight.flight_surcharge || 0);
      if (base > 0) return base;
    }
    // ultimo fallback: price (alias eventuale) oppure 0
    return this.flight?.price || 0;
  }

  getEconomyTotal(): number {
  const rawBase = this.getEconomyBase();
  const rawSurcharge = this.flight?.flight_surcharge ?? 0;
  const base = Number(rawBase) || 0;
  const surcharge = Number(rawSurcharge) || 0;
  const total = base + surcharge;
  // Se surcharge è negativo o dati inconsistenti, fallback al base
  if (total < 0) return base;
  return total;
  }

  showBreakdown(): boolean {
    return true; // sempre visibile; cambiare in condizione se necessario
  }

  formatPrice(val: any): string {
    const n = Number(val);
    if (!isFinite(n)) return '0.00';
    return n.toFixed(2);
  }

  bookFlight(): void {
    console.log('Prenotazione volo:', this.flight.flight_number);
    this.router.navigate(['/flights', this.flight.id, 'seats']);
  }

  // Metodi per la gestione dello stato dei voli
  getStatusLabel(): string {
    const status = this.flight.status?.toLowerCase();
    
    switch (status) {
      case 'scheduled':
        return 'Programmato';
      case 'delayed':
        if (typeof this.flight.delay_minutes === 'number' && this.flight.delay_minutes > 0) {
          return `In Ritardo ${this.flight.delay_minutes}min`;
        }
        return 'In Ritardo';
      case 'cancelled':
        return 'Cancellato';
      case 'completed':
        return 'Completato';
      default:
        return 'Programmato';
    }
  }

  getStatusColor(): string {
    const status = this.flight.status?.toLowerCase();
    
    switch (status) {
      case 'scheduled':
        return '#10b981'; // Verde
      case 'delayed':
        return '#f59e0b'; // Giallo/Arancione
      case 'cancelled':
        return '#ef4444'; // Rosso
      case 'completed':
        return '#3b82f6'; // Blu
      default:
        return '#10b981'; // Verde di default
    }
  }

  isFlightUnavailable(): boolean {
    const status = this.flight.status?.toLowerCase();
    return status === 'cancelled' || status === 'completed';
  }
}
