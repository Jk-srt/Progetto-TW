import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalFlightsService } from '../services/global-flights.service';
import { FlightsGridComponent } from './flights-grid/flights-grid.component';
import { WelcomeSectionComponent } from './welcome-section/welcome-section.component';
import { StatsSectionComponent, StatCard } from './stats-section/stats-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FlightsGridComponent,
    WelcomeSectionComponent,
    StatsSectionComponent
  ],
  template: `
    <div class="home-container">
      <!-- Sezione benvenuto -->
      <app-welcome-section></app-welcome-section>

      <!-- Statistiche rapide -->
      <app-stats-section [stats]="stats"></app-stats-section>

      <!-- Sezione voli -->
      <div class="flights-section">
        <div class="section-header">
          <h2>Voli Disponibili</h2>
          <p class="flights-count">{{flights.length}} voli trovati</p>
        </div>
        <app-flights-grid [flights]="flights"></app-flights-grid>
      </div>
    </div>
  `,
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  flights: any[] = [];
  stats: StatCard[] = [];

  constructor(private globalFlights: GlobalFlightsService) {}

  ngOnInit() {
    // Sottoscrizione ai flights globali
    this.globalFlights.flights$.subscribe(flights => {
      this.flights = flights;
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
    this.stats = [
      {
        icon: '🛫',
        number: this.flights.length,
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
}
