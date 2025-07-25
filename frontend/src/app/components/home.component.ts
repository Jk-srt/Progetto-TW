import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Flight } from '../models/flight.model';
import { FlightService } from '../services/flight.service';
import { WelcomeSectionComponent } from './welcome-section/welcome-section.component';
import { StatsSectionComponent, StatCard } from './stats-section/stats-section.component';
import { FlightFiltersComponent, FilterType } from './flight-filters/flight-filters.component';
import { FlightsGridComponent } from './flights-grid/flights-grid.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    WelcomeSectionComponent,
    StatsSectionComponent,
    FlightFiltersComponent,
    FlightsGridComponent
  ],
  template: `
    <div class="home-container">
      <!-- Sezione benvenuto -->
      <app-welcome-section></app-welcome-section>

      <!-- Statistiche rapide -->
      <app-stats-section [stats]="stats"></app-stats-section>

      <!-- Sezione voli -->
      <div class="flights-section">
        <app-flight-filters 
          [selectedFilter]="selectedFilter"
          (filterChange)="onFilterChange($event)">
        </app-flight-filters>

        <app-flights-grid [flights]="filteredFlights"></app-flights-grid>
      </div>
    </div>
  `,
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  selectedFilter: FilterType = 'all';
  flights: Flight[] = [];
  filteredFlights: Flight[] = [];
  stats: StatCard[] = [];

  constructor(private flightService: FlightService) {}

  ngOnInit() {
    this.loadFlights();
    this.updateStats();
  }

  private loadFlights() {
    this.flightService.getFlights().subscribe(flights => {
      this.flights = flights;
      this.updateFilteredFlights();
    });
  }

  private updateStats() {
    this.flightService.getFlights().subscribe(flights => {
      this.flightService.getActiveFlights().subscribe(activeFlights => {
        this.flightService.getOnTimeFlights().subscribe(onTimeFlights => {
          this.stats = [
            {
              icon: '🛫',
              number: flights.length,
              label: 'Voli Oggi'
            },
            {
              icon: '✈️',
              number: activeFlights.length,
              label: 'Voli Attivi'
            },
            {
              icon: '⏰',
              number: onTimeFlights.length,
              label: 'In Orario'
            },
            {
              icon: '🎫',
              number: 247,
              label: 'Prenotazioni'
            }
          ];
        });
      });
    });
  }

  onFilterChange(filter: FilterType) {
    this.selectedFilter = filter;
    this.updateFilteredFlights();
  }

  private updateFilteredFlights() {
    this.flightService.filterFlights(this.selectedFilter).subscribe(flights => {
      this.filteredFlights = flights;
    });
  }
}
