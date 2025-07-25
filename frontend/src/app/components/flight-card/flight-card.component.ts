import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../../models/flight.model';

@Component({
  selector: 'app-flight-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flight-card">
      <div class="flight-header">
        <div class="flight-number">{{flight.flightNumber}}</div>
        <div class="status-badge" [ngClass]="getStatusClass(flight.status)">
          {{flight.status}}
        </div>
      </div>
      
      <div class="flight-route">
        <div class="airport">
          <div class="airport-code">{{getAirportCode(flight.origin)}}</div>
          <div class="airport-name">{{flight.origin}}</div>
          <div class="time">{{flight.departureTime}}</div>
        </div>
        <div class="route-line">
          <div class="airplane-icon">✈️</div>
        </div>
        <div class="airport">
          <div class="airport-code">{{getAirportCode(flight.destination)}}</div>
          <div class="airport-name">{{flight.destination}}</div>
          <div class="time">{{flight.arrivalTime}}</div>
        </div>
      </div>
      
      <div class="flight-details">
        <div class="airline">{{flight.airline}}</div>
        <div class="aircraft">{{flight.aircraft}}</div>
        <div class="price">€{{flight.price}}</div>
      </div>
    </div>
  `,
  styleUrl: './flight-card.component.scss'
})
export class FlightCardComponent {
  @Input() flight!: Flight;

  getAirportCode(airportName: string): string {
    const codes: { [key: string]: string } = {
      'Roma Fiumicino': 'FCO',
      'Milano Malpensa': 'MXP',
      'Francoforte': 'FRA',
      'Parigi CDG': 'CDG',
      'Londra Heathrow': 'LHR',
      'Amsterdam': 'AMS'
    };
    return codes[airportName] || 'N/A';
  }

  getStatusClass(status: string): string {
    return 'status-' + status.toLowerCase().replace(' ', '-');
  }
}
