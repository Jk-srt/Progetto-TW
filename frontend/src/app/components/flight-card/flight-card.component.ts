import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Flight } from '../../models/flight.model';

@Component({
  selector: 'app-flight-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flight-card" style="background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 16px;">
      <div class="flight-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
        <div class="flight-info">
          <div class="flight-number" style="font-size: 1.1rem; font-weight: 600; color: #1e293b;">Volo {{flight.flight_number}}</div>
          <div class="airline-name" style="font-size: 0.9rem; color: #64748b; margin-top: 2px;">{{flight.airline || 'N/A'}}</div>
        </div>
        <div class="status-badge" style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem;">In Orario</div>
      </div>
      
      <div class="flight-route" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <div class="airport" style="flex: 1; text-align: center;">
          <div class="airport-code" style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 4px;">{{getAirportCode(flight.departure_airport)}}</div>
          <div class="airport-name" style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px;">{{flight.departure_airport}}</div>
          <div class="city-name" style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px;">{{flight.departure_city || 'N/A'}}</div>
          <div class="time" style="font-size: 1rem; font-weight: 600; color: #475569;">{{formatTime(flight.departure_time)}}</div>
        </div>
        <div class="route-line" style="display: flex; align-items: center; justify-content: center; margin: 0 20px; position: relative;">
          <div style="position: absolute; width: 80px; height: 2px; background: linear-gradient(to right, #cbd5e1, #667eea, #cbd5e1);"></div>
          <div class="airplane-icon" style="background: white; border-radius: 50%; padding: 8px; font-size: 1.2rem; position: relative; z-index: 2; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">✈️</div>
        </div>
        <div class="airport" style="flex: 1; text-align: center;">
          <div class="airport-code" style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 4px;">{{getAirportCode(flight.arrival_airport)}}</div>
          <div class="airport-name" style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px;">{{flight.arrival_airport}}</div>
          <div class="city-name" style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px;">{{flight.arrival_city || 'N/A'}}</div>
          <div class="time" style="font-size: 1rem; font-weight: 600; color: #475569;">{{formatTime(flight.arrival_time)}}</div>
        </div>
      </div> 
      
      <div class="flight-details" style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #f1f5f9;">
        <div class="flight-date" style="color: #64748b; font-size: 0.9rem;">{{formatDate(flight.departure_time)}}</div>
        <div class="price-and-book" style="display: flex; align-items: center; gap: 16px;">
          <div class="price" style="font-size: 1.4rem; font-weight: 700; color: #0f172a;">€{{flight.price}}</div>
          <button 
            (click)="bookFlight()"
            style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-size: 0.9rem;"
            onmouseover="this.style.background='#5a67d8'"
            onmouseout="this.style.background='#667eea'">
            Prenota
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './flight-card.component.scss'
})
export class FlightCardComponent {
  @Input() flight!: any;

  constructor(private router: Router) {}

  getAirportCode(airportName: string): string {
    if (!airportName) return 'N/A';
    
    const codes: { [key: string]: string } = {
      'Roma Fiumicino': 'FCO',
      'Milano Malpensa': 'MXP', 
      'Francoforte': 'FRA',
      'Parigi CDG': 'CDG',
      'Londra Heathrow': 'LHR',
      'Amsterdam': 'AMS'
    };
    return codes[airportName] || airportName.substring(0, 3).toUpperCase();
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

  bookFlight(): void {
    console.log('Prenotazione volo:', this.flight.flight_number);
    // Naviga alla pagina di selezione posti
    this.router.navigate(['/flights', this.flight.id, 'seats']);
  }
}
