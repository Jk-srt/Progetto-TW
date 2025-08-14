import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AirportService } from '../../services/airport.service';
import { Airport } from '../../models/flight.model';

export interface FlightSearchCriteria {
  departure: string;
  arrival: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  roundTrip: boolean;
}

@Component({
  selector: 'app-flight-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flight-search">
      <div class="search-header">
        <h2>Cerca Voli</h2>
        <p>Trova il volo perfetto per il tuo viaggio</p>
      </div>

      <div class="search-form">
        <div class="form-row">
          <div class="form-group">
            <label for="departure">Da</label>
            <select id="departure" [(ngModel)]="searchCriteria.departure">
              <option value="">Seleziona partenza</option>
              <option *ngFor="let a of airports" [value]="formatAirportValue(a)">
                {{ formatAirportLabel(a) }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="arrival">A</label>
            <select id="arrival" [(ngModel)]="searchCriteria.arrival">
              <option value="">Seleziona destinazione</option>
              <option *ngFor="let a of airports" [value]="formatAirportValue(a)">
                {{ formatAirportLabel(a) }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="departureDate">Data partenza</label>
            <input type="date" id="departureDate" [(ngModel)]="searchCriteria.departureDate" [min]="today">
          </div>

          <div class="form-group">
            <label for="passengers">Passeggeri</label>
            <select id="passengers" [(ngModel)]="searchCriteria.passengers">
              <option [value]="1">1 Passeggero</option>
              <option [value]="2">2 Passeggeri</option>
              <option [value]="3">3 Passeggeri</option>
              <option [value]="4">4 Passeggeri</option>
              <option [value]="5">5+ Passeggeri</option>
            </select>
          </div>

          <div class="form-group">
            <button type="button" class="search-btn" (click)="searchFlights()" [disabled]="!isFormValid()">
              🔍 Cerca Voli
            </button>
          </div>
          
          <div class="form-group">
            <button type="button" class="reset-btn" (click)="resetSearch()">
              🔄 Nuova Ricerca
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .flight-search {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 20px;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }

    .search-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .search-header h2 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .search-header p {
      margin: 0;
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      align-items: end;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 0.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .form-group select,
    .form-group input {
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      background: rgba(255, 255, 255, 0.9);
      color: #333;
    }

    .form-group select:focus,
    .form-group input:focus {
      outline: none;
      background: white;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
    }

    .search-btn {
      padding: 12px 24px;
      background: #48bb78;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      height: fit-content;
    }

    .search-btn:hover:not(:disabled) {
      background: #38a169;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(72, 187, 120, 0.4);
    }

    .search-btn:disabled {
      background: rgba(255, 255, 255, 0.3);
      cursor: not-allowed;
      transform: none;
    }

    .reset-btn {
      padding: 12px 24px;
      background: transparent;
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      height: fit-content;
    }

    .reset-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.8);
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FlightSearchComponent implements OnInit {
  @Output() searchRequested = new EventEmitter<FlightSearchCriteria>();
  @Output() resetRequested = new EventEmitter<void>();

  today = new Date().toISOString().split('T')[0];
  airports: Airport[] = [];

  searchCriteria: FlightSearchCriteria = {
    departure: '',
    arrival: '',
    departureDate: '',
    returnDate: '',
    passengers: 1,
    roundTrip: false
  };

  constructor(private airportService: AirportService) {}

  ngOnInit(): void {
    // Sottoscrizione all'elenco aeroporti centralizzato
    this.airportService.getAirports().subscribe({
      next: (airports) => this.airports = airports || [],
      error: (err) => {
        console.error('Errore nel caricamento degli aeroporti:', err);
        this.airports = [];
      }
    });
  }

  isFormValid(): boolean {
    // La data di partenza è ora opzionale: basta che partenza, arrivo siano valorizzati e diversi
    return !!(
      this.searchCriteria.departure &&
      this.searchCriteria.arrival &&
      this.searchCriteria.departure !== this.searchCriteria.arrival
    );
  }

  searchFlights(): void {
    if (this.isFormValid()) {
      // Assicura che sia sempre solo andata
      this.searchCriteria.roundTrip = false;
      this.searchCriteria.returnDate = '';
  // Log sintetico
  console.log('Ricerca voli (solo andata):', this.searchCriteria);
      this.searchRequested.emit(this.searchCriteria);
    }
  }

  resetSearch(): void {
    this.searchCriteria = {
      departure: '',
      arrival: '',
      departureDate: '',
      returnDate: '',
      passengers: 1,
      roundTrip: false
    };
    this.resetRequested.emit();
  }

  // Helpers per visualizzare i campi aeroporto
  formatAirportLabel(a: Airport): string {
  return a ? `${a.name} - ${a.city} (${a.iata_code})` : '';
  }

  formatAirportValue(a: Airport): string {
  // Valore usato nella ricerca: SOLO nome aeroporto + codice (senza città) per compatibilità backend
  return a ? `${a.name} (${a.iata_code})` : '';
  }
}
