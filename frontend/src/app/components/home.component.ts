import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  status: 'On Time' | 'Delayed' | 'Boarding' | 'Departed';
  aircraft: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <!-- Sezione benvenuto -->
      <div class="welcome-section">
        <div class="welcome-content">
          <h1>Benvenuto nel Sistema di Gestione Voli</h1>
          <p>Monitora i voli in tempo reale e gestisci le prenotazioni con facilità</p>
        </div>
      </div>

      <!-- Statistiche rapide -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-icon">🛫</div>
          <div class="stat-number">{{flights.length}}</div>
          <div class="stat-label">Voli Oggi</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✈️</div>
          <div class="stat-number">{{getActiveFlights()}}</div>
          <div class="stat-label">Voli Attivi</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏰</div>
          <div class="stat-number">{{getOnTimeFlights()}}</div>
          <div class="stat-label">In Orario</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎫</div>
          <div class="stat-number">247</div>
          <div class="stat-label">Prenotazioni</div>
        </div>
      </div>

      <!-- Lista voli -->
      <div class="flights-section">
        <div class="section-header">
          <h2>Voli in Programmazione</h2>
          <div class="filters">
            <button 
              class="filter-btn" 
              [class.active]="selectedFilter === 'all'"
              (click)="setFilter('all')">
              Tutti
            </button>
            <button 
              class="filter-btn" 
              [class.active]="selectedFilter === 'departures'"
              (click)="setFilter('departures')">
              Partenze
            </button>
            <button 
              class="filter-btn" 
              [class.active]="selectedFilter === 'arrivals'"
              (click)="setFilter('arrivals')">
              Arrivi
            </button>
          </div>
        </div>

        <div class="flights-grid">
          <div class="flight-card" *ngFor="let flight of getFilteredFlights()">
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
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Sezione benvenuto */
    .welcome-section {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 3rem;
      margin-bottom: 2rem;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }

    .welcome-content h1 {
      font-size: 2.5rem;
      color: #2c3e50;
      margin-bottom: 1rem;
      font-weight: 700;
    }

    .welcome-content p {
      font-size: 1.2rem;
      color: #7f8c8d;
      font-weight: 300;
    }

    /* Statistiche */
    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .stat-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 1rem;
      color: #7f8c8d;
      font-weight: 500;
    }

    /* Sezione voli */
    .flights-section {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-header h2 {
      font-size: 2rem;
      color: #2c3e50;
      font-weight: 600;
    }

    .filters {
      display: flex;
      gap: 0.5rem;
    }

    .filter-btn {
      padding: 0.75rem 1.5rem;
      border: 2px solid #e0e6ed;
      background: white;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      color: #7f8c8d;
    }

    .filter-btn:hover {
      border-color: #667eea;
      color: #667eea;
    }

    .filter-btn.active {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }

    /* Griglia voli */
    .flights-grid {
      display: grid;
      gap: 1.5rem;
    }

    .flight-card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      border: 1px solid #e0e6ed;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .flight-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      border-color: #667eea;
    }

    .flight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .flight-number {
      font-size: 1.2rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-on-time { background: #d4edda; color: #155724; }
    .status-delayed { background: #f8d7da; color: #721c24; }
    .status-boarding { background: #fff3cd; color: #856404; }
    .status-departed { background: #d1ecf1; color: #0c5460; }

    /* Rotta del volo */
    .flight-route {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .airport {
      text-align: center;
      flex: 1;
    }

    .airport-code {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 0.25rem;
    }

    .airport-name {
      font-size: 0.9rem;
      color: #7f8c8d;
      margin-bottom: 0.5rem;
    }

    .time {
      font-size: 1.1rem;
      font-weight: 600;
      color: #667eea;
    }

    .route-line {
      display: flex;
      align-items: center;
      flex: 2;
      position: relative;
    }

    .route-line::before {
      content: '';
      position: absolute;
      width: 100%;
      height: 2px;
      background: linear-gradient(to right, #667eea, #764ba2);
      left: 0;
      top: 50%;
      transform: translateY(-50%);
    }

    .airplane-icon {
      background: white;
      border-radius: 50%;
      padding: 0.5rem;
      margin: 0 auto;
      z-index: 1;
      position: relative;
      font-size: 1.2rem;
    }

    /* Dettagli volo */
    .flight-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid #e0e6ed;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .airline {
      font-weight: 600;
      color: #2c3e50;
    }

    .aircraft {
      color: #7f8c8d;
      font-size: 0.9rem;
    }

    .price {
      font-size: 1.2rem;
      font-weight: 700;
      color: #667eea;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .welcome-content h1 {
        font-size: 2rem;
      }
      
      .section-header {
        flex-direction: column;
        align-items: stretch;
      }
      
      .filters {
        justify-content: center;
      }
      
      .flight-route {
        flex-direction: column;
        gap: 1.5rem;
      }
      
      .route-line {
        order: 2;
        height: 50px;
        flex-direction: column;
        justify-content: center;
      }
      
      .route-line::before {
        width: 2px;
        height: 100%;
        background: linear-gradient(to bottom, #667eea, #764ba2);
      }
      
      .flight-details {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  selectedFilter: 'all' | 'departures' | 'arrivals' = 'all';
  
  flights: Flight[] = [
    {
      id: '1',
      flightNumber: 'AZ123',
      airline: 'Alitalia',
      origin: 'Roma Fiumicino',
      destination: 'Milano Malpensa',
      departureTime: '08:30',
      arrivalTime: '09:45',
      price: 89,
      status: 'On Time',
      aircraft: 'Airbus A320'
    },
    {
      id: '2',
      flightNumber: 'LH456',
      airline: 'Lufthansa',
      origin: 'Milano Malpensa',
      destination: 'Francoforte',
      departureTime: '11:15',
      arrivalTime: '12:30',
      price: 156,
      status: 'Boarding',
      aircraft: 'Boeing 737'
    },
    {
      id: '3',
      flightNumber: 'AF789',
      airline: 'Air France',
      origin: 'Parigi CDG',
      destination: 'Roma Fiumicino',
      departureTime: '14:20',
      arrivalTime: '16:10',
      price: 134,
      status: 'Delayed',
      aircraft: 'Airbus A319'
    },
    {
      id: '4',
      flightNumber: 'BA101',
      airline: 'British Airways',
      origin: 'Londra Heathrow',
      destination: 'Milano Malpensa',
      departureTime: '16:45',
      arrivalTime: '19:20',
      price: 198,
      status: 'On Time',
      aircraft: 'Boeing 787'
    },
    {
      id: '5',
      flightNumber: 'KL234',
      airline: 'KLM',
      origin: 'Amsterdam',
      destination: 'Roma Fiumicino',
      departureTime: '18:30',
      arrivalTime: '20:45',
      price: 167,
      status: 'Departed',
      aircraft: 'Airbus A330'
    }
  ];

  ngOnInit() {
    // Inizializzazione del componente
  }

  setFilter(filter: 'all' | 'departures' | 'arrivals') {
    this.selectedFilter = filter;
  }

  getFilteredFlights(): Flight[] {
    switch (this.selectedFilter) {
      case 'departures':
        return this.flights.filter(f => f.status === 'Boarding' || f.status === 'On Time');
      case 'arrivals':
        return this.flights.filter(f => f.status === 'Departed' || f.status === 'Delayed');
      default:
        return this.flights;
    }
  }

  getActiveFlights(): number {
    return this.flights.filter(f => f.status === 'Boarding' || f.status === 'On Time').length;
  }

  getOnTimeFlights(): number {
    return this.flights.filter(f => f.status === 'On Time').length;
  }

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
