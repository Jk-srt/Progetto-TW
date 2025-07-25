import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../../models/flight.model';
import { FlightCardComponent } from '../flight-card/flight-card.component';

@Component({
  selector: 'app-flights-grid',
  standalone: true,
  imports: [CommonModule, FlightCardComponent],
  template: `
    <div class="flights-grid">
      <app-flight-card 
        *ngFor="let flight of flights" 
        [flight]="flight">
      </app-flight-card>
    </div>
  `,
  styleUrl: './flights-grid.component.scss'
})
export class FlightsGridComponent {
  @Input() flights: Flight[] = [];
}
