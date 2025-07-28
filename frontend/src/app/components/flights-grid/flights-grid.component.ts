import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../../models/flight.model';
import { FlightCardComponent } from '../flight-card/flight-card.component';

@Component({
  selector: 'app-flights-grid',
  standalone: true,
  imports: [CommonModule, FlightCardComponent],
  template: `
    <div class="flights-grid">
      <div class="flights-container" *ngIf="flights.length > 0; else noFlights">
        <app-flight-card 
          *ngFor="let flight of flights; trackBy: trackByFn" 
          [flight]="flight"
          class="flight-card-wrapper">
        </app-flight-card>
      </div>
      
      <ng-template #noFlights>
        <div class="no-flights">
          <div class="no-flights-icon">✈️</div>
          <h3>Nessun volo disponibile</h3>
          <p>Al momento non ci sono voli da mostrare.</p>
        </div>
      </ng-template>
    </div>
  `,
  styleUrl: './flights-grid.component.scss'
})
export class FlightsGridComponent implements OnInit, OnChanges {
  @Input() flights: any[] = [];

  trackByFn(index: number, flight: any): string {
    return flight.id;
  }

  ngOnInit() {
    console.log('🎯 FlightsGridComponent initialized with', this.flights.length, 'flights');
  }

  ngOnChanges() {
    console.log('🔄 FlightsGridComponent flights changed:', this.flights.length, 'flights');
  }
}
