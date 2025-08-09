import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FlightConnectionService, FlightConnection } from '../../services/flight-connection.service';
import { MultiSegmentBookingService, MultiSegmentBooking, MultiSegmentFlightData } from '../../services/multi-segment-booking.service';

interface FlightSegment {
  flightNumber: string;
  flightId: number;
  route: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  completed: boolean;
}

@Component({
  selector: 'app-multi-segment-seats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="multi-segment-container">
      <div class="header">
        <h1>🔗 Prenotazione Volo con Scalo</h1>
        <p>Completa la prenotazione per entrambi i segmenti</p>
      </div>

      <div class="connection-summary" *ngIf="connection">
        <div class="summary-card">
          <h2>{{ connection.totalDuration }} - {{ connection.totalPrice | currency:'EUR':'symbol':'1.2-2' }}</h2>
          <div class="route-display">
            <span class="city">{{ segments[0]?.departure || '' }}</span>
            <div class="flight-path">
              <span class="flight-number">{{ segments[0]?.flightNumber || '' }}</span>
              <div class="arrow">✈️ →</div>
            </div>
            <span class="city">{{ segments[0]?.arrival || '' }}</span>
            <div class="stopover">🔄 SCALO</div>
            <div class="flight-path">
              <span class="flight-number">{{ segments[1]?.flightNumber || '' }}</span>
              <div class="arrow">✈️ →</div>
            </div>
            <span class="city">{{ segments[1]?.arrival || '' }}</span>
          </div>
        </div>
      </div>

      <div class="segments-container" *ngIf="segments.length > 0">
        <div class="segment-card" 
             *ngFor="let segment of segments; let i = index"
             [class.completed]="segment.completed">
          <div class="segment-header">
            <h3>Segmento {{ i + 1 }}: {{ segment.route }}</h3>
            <span class="status" [class.completed]="segment.completed">
              {{ segment.completed ? '✅ Prenotato' : '📝 Da prenotare' }}
            </span>
          </div>
          
          <div class="segment-details">
            <div class="flight-info">
              <p><strong>Volo:</strong> {{ segment.flightNumber }}</p>
              <p><strong>Orario:</strong> {{ segment.departureTime }} → {{ segment.arrivalTime }}</p>
              <p><strong>Prezzo:</strong> {{ segment.price | currency:'EUR':'symbol':'1.2-2' }}</p>
            </div>
            
            <div class="segment-actions">
              <button 
                class="btn btn-primary"
                (click)="bookSegment(segment, i)"
                [disabled]="segment.completed || isBooking">
                {{ segment.completed ? 'Prenotato' : 'Prenota Posto' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="booking-controls" *ngIf="allSegmentsCompleted()">
        <div class="completion-message">
          <h3>🎉 Tutti i segmenti sono stati prenotati!</h3>
          <p>Procedi al checkout per finalizzare la prenotazione</p>
        </div>
        
        <div class="total-summary">
          <p><strong>Prezzo totale: {{ getTotalPrice() | currency:'EUR':'symbol':'1.2-2' }}</strong></p>
        </div>
        
        <button 
          class="btn btn-success btn-large"
          (click)="proceedToCheckout()">
          Procedi al Checkout
        </button>
      </div>

      <div class="back-controls">
        <button class="btn btn-secondary" (click)="goBack()">
          ← Torna alla Ricerca
        </button>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Caricamento...</p>
      </div>

      <div class="error" *ngIf="error">
        <div class="error-message">
          <h3>❌ Errore</h3>
          <p>{{ error }}</p>
          <button class="btn btn-secondary" (click)="goBack()">Torna Indietro</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .multi-segment-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .header {
      text-align: center;
      color: white;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .connection-summary {
      max-width: 1000px;
      margin: 0 auto 2rem;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .route-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }

    .city {
      font-weight: bold;
      font-size: 1.2rem;
      color: #333;
    }

    .flight-path {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .flight-number {
      background: #667eea;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .arrow {
      font-size: 1.5rem;
    }

    .stopover {
      background: #ffc107;
      color: #333;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: bold;
      font-size: 0.9rem;
    }

    .segments-container {
      max-width: 1000px;
      margin: 0 auto;
      display: grid;
      gap: 1.5rem;
    }

    .segment-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .segment-card.completed {
      border-left: 4px solid #28a745;
      background: #f8fff9;
    }

    .segment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #eee;
    }

    .status {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
      background: #ffc107;
      color: #333;
    }

    .status.completed {
      background: #28a745;
      color: white;
    }

    .segment-details {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2rem;
      align-items: center;
    }

    .flight-info p {
      margin: 0.5rem 0;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5a6fd8;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-large {
      padding: 1rem 2rem;
      font-size: 1.1rem;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .booking-controls {
      max-width: 1000px;
      margin: 2rem auto;
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .completion-message {
      margin-bottom: 1.5rem;
    }

    .total-summary {
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
    }

    .back-controls {
      max-width: 1000px;
      margin: 2rem auto;
      text-align: center;
    }

    .loading, .error {
      max-width: 1000px;
      margin: 2rem auto;
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
    }

    .error-message h3 {
      color: #dc3545;
      margin-bottom: 1rem;
    }

    @media (max-width: 768px) {
      .route-display {
        flex-direction: column;
        gap: 0.5rem;
      }

      .segment-details {
        grid-template-columns: 1fr;
        gap: 1rem;
        text-align: center;
      }
    }
  `]
})
export class MultiSegmentSeatsComponent implements OnInit {
  connection: FlightConnection | null = null;
  segments: MultiSegmentFlightData[] = [];
  currentBooking: MultiSegmentBooking | null = null;
  loading = true;
  error = '';
  isBooking = false;
  
  private bookedSegments: Set<number> = new Set();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private flightConnectionService: FlightConnectionService,
    private multiSegmentBookingService: MultiSegmentBookingService
  ) {}

  ngOnInit() {
    this.loadBookingFromService();
  }

  private loadBookingFromService() {
    // Ottieni la prenotazione corrente dal servizio
    this.currentBooking = this.multiSegmentBookingService.getCurrentBooking();
    
    if (this.currentBooking) {
      this.connection = this.currentBooking.connection;
      this.segments = this.currentBooking.segments;
      this.loading = false;
      
      console.log('✅ Multi-segment booking caricata dal servizio:', this.currentBooking);
    } else {
      this.error = 'Dati del volo con scalo non trovati. Torna alla ricerca.';
      this.loading = false;
      
      console.error('❌ Nessuna prenotazione multi-segmento trovata nel servizio');
    }
  }

  bookSegment(segment: MultiSegmentFlightData, index: number) {
    if (this.isBooking || segment.completed) return;

    console.log('🎯 Navigazione alla selezione posti per segmento:', segment.flightNumber);
    
    // Naviga alla pagina di selezione posti per questo specifico volo
    this.router.navigate(['/flights', segment.flightId, 'seats'], {
      state: {
        isMultiSegment: true,
        currentSegmentIndex: index,
        totalSegments: this.segments.length,
        returnPath: '/multi-segment-booking'
      }
    });
  }

  allSegmentsCompleted(): boolean {
    return this.segments.every(segment => segment.completed);
  }

  getTotalPrice(): number {
    return this.multiSegmentBookingService.getTotalPrice();
  }

  proceedToCheckout() {
    if (!this.allSegmentsCompleted()) return;

    console.log('🎯 Procedendo al checkout multi-segmento');

    // Ottieni i dati di checkout dal servizio
    const checkoutData = this.multiSegmentBookingService.getCheckoutData();
    
    if (checkoutData) {
      // Naviga al checkout con i dati di tutti i segmenti
      this.router.navigate(['/checkout'], {
        state: checkoutData
      });
    } else {
      console.error('❌ Errore nel recupero dati checkout');
      this.error = 'Errore nel recupero dati per il checkout. Riprova.';
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
