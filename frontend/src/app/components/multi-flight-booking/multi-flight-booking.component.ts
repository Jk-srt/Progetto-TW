import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FlightConnectionService, FlightConnection } from '../../services/flight-connection.service';
import { SeatService } from '../../services/seat.service';

interface BookingStep {
  flightNumber: string;
  flightId: number;
  route: string;
  selectedSeats: any[];
  completed: boolean;
}

@Component({
  selector: 'app-multi-flight-booking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="multi-flight-booking">
      <div class="header">
        <h1>🔗 Prenotazione Volo con Scalo</h1>
        <p>Seleziona i posti per tutti i segmenti del tuo viaggio</p>
      </div>

      <div class="booking-progress" *ngIf="connection">
        <div class="progress-header">
          <h2>{{ connection.totalDuration }} - {{ connection.totalPrice | currency:'EUR':'symbol':'1.2-2' }}</h2>
          <p>{{ connection.outboundFlight.departure_city }} → {{ connection.connectionFlight?.arrival_city }}</p>
        </div>

        <div class="flight-segments">
          <div class="segment" 
               [class.active]="currentStep === 0"
               [class.completed]="steps.length > 0 && !!steps[0] && steps[0].completed">
            <div class="segment-header">
              <h3>✈️ Segmento 1: {{ steps.length > 0 && steps[0] ? steps[0].route : '' }}</h3>
              <span class="status">
                {{ (steps.length > 0 && steps[0] && steps[0].completed) ? '✅ Completato' : (currentStep === 0 ? '🔄 In corso' : '⏳ In attesa') }}
              </span>
            </div>
            <p>Volo {{ steps.length > 0 && steps[0] ? steps[0].flightNumber : '' }}</p>
            <p *ngIf="steps.length > 0 && steps[0] && steps[0].selectedSeats && steps[0].selectedSeats.length > 0">
              Posti selezionati: {{ steps[0].selectedSeats.length || 0 }}
            </p>
          </div>

          <div class="segment" 
               [class.active]="currentStep === 1"
               [class.completed]="steps.length > 1 && !!steps[1] && steps[1].completed">
            <div class="segment-header">
              <h3>✈️ Segmento 2: {{ steps.length > 1 && steps[1] ? steps[1].route : '' }}</h3>
              <span class="status">
                {{ (steps.length > 1 && steps[1] && steps[1].completed) ? '✅ Completato' : (currentStep === 1 ? '🔄 In corso' : '⏳ In attesa') }}
              </span>
            </div>
            <p>Volo {{ steps.length > 1 && steps[1] ? steps[1].flightNumber : '' }}</p>
            <p *ngIf="steps.length > 1 && steps[1] && steps[1].selectedSeats && steps[1].selectedSeats.length > 0">
              Posti selezionati: {{ steps[1].selectedSeats.length || 0 }}
            </p>
          </div>
        </div>

        <div class="current-step" *ngIf="currentFlightStep">
          <iframe 
            [src]="getSeatSelectionUrl()" 
            class="seat-iframe"
            (load)="onIframeLoad()">
          </iframe>
        </div>

        <div class="step-controls">
          <button 
            class="btn btn-secondary" 
            (click)="goToPreviousStep()" 
            [disabled]="currentStep === 0">
            ← Segmento Precedente
          </button>
          
          <button 
            class="btn btn-primary" 
            (click)="goToNextStep()" 
            [disabled]="!canProceedToNext()">
            {{ isLastStep() ? 'Procedi al Checkout' : 'Segmento Successivo →' }}
          </button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Caricamento dettagli volo...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn btn-secondary" (click)="goBack()">Torna Indietro</button>
      </div>
    </div>
  `,
  styles: [`
    .multi-flight-booking {
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

    .booking-progress {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      max-width: 1200px;
      margin: 0 auto;
    }

    .progress-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #eee;
    }

    .flight-segments {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .segment {
      background: #f8f9fa;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .segment.active {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }

    .segment.completed {
      border-color: #28a745;
      background: #f8fff9;
    }

    .segment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .status {
      font-size: 0.9rem;
      font-weight: 500;
    }

    .current-step {
      margin: 2rem 0;
    }

    .seat-iframe {
      width: 100%;
      height: 600px;
      border: none;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .step-controls {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
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

    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading, .error {
      text-align: center;
      color: white;
      margin: 2rem;
    }

    .error {
      background: rgba(220, 53, 69, 0.1);
      border: 1px solid #dc3545;
      border-radius: 8px;
      padding: 2rem;
      color: #dc3545;
    }

    @media (max-width: 768px) {
      .flight-segments {
        grid-template-columns: 1fr;
      }
      
      .step-controls {
        flex-direction: column;
      }
    }
  `]
})
export class MultiFlightBookingComponent implements OnInit {
  connection: FlightConnection | null = null;
  currentStep = 0;
  loading = true;
  error = '';
  
  steps: BookingStep[] = [];
  currentFlightStep: BookingStep | null = null;
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private flightConnectionService: FlightConnectionService,
    private seatService: SeatService
  ) {}

  ngOnInit() {
    this.loadConnectionFromRoute();
  }

  private loadConnectionFromRoute() {
    // Ottieni i dati della connessione dal navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['connection']) {
      this.connection = navigation.extras.state['connection'] as FlightConnection;
      this.initializeSteps();
      this.loading = false;
    } else {
      this.error = 'Dati del volo con scalo non trovati. Torna alla ricerca.';
      this.loading = false;
    }
  }

  private initializeSteps() {
    if (!this.connection) return;

    this.steps = [
      {
        flightNumber: this.connection.outboundFlight.flight_number || '',
        flightId: this.connection.outboundFlight.id,
        route: `${this.connection.outboundFlight.departure_city} → ${this.connection.outboundFlight.arrival_city}`,
        selectedSeats: [],
        completed: false
      },
      {
        flightNumber: this.connection.connectionFlight!.flight_number || '',
        flightId: this.connection.connectionFlight!.id,
        route: `${this.connection.connectionFlight!.departure_city} → ${this.connection.connectionFlight!.arrival_city}`,
        selectedSeats: [],
        completed: false
      }
    ];

    this.currentFlightStep = this.steps[0];
  }

  getSeatSelectionUrl(): string {
    if (!this.currentFlightStep) return '';
    
    // URL per la selezione posti del volo corrente
    return `/flights/${this.currentFlightStep.flightId}/seats`;
  }

  onIframeLoad() {
    console.log('🔄 Iframe caricato per volo:', this.currentFlightStep?.flightNumber);
    
    // TODO: Implementare comunicazione con iframe per ricevere posti selezionati
    // Potremmo usare postMessage per comunicare tra parent e iframe
  }

  canProceedToNext(): boolean {
    return (this.currentFlightStep?.selectedSeats?.length ?? 0) > 0 || (this.currentFlightStep?.completed ?? false);
  }

  isLastStep(): boolean {
    return this.currentStep === this.steps.length - 1;
  }

  goToPreviousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.currentFlightStep = this.steps[this.currentStep];
    }
  }

  goToNextStep() {
    if (!this.canProceedToNext()) return;

    // Marca il step corrente come completato
    if (this.currentFlightStep) {
      this.currentFlightStep.completed = true;
    }

    if (this.isLastStep()) {
      // Procedi al checkout con tutti i voli
      this.proceedToCheckout();
    } else {
      // Vai al prossimo segmento
      this.currentStep++;
      this.currentFlightStep = this.steps[this.currentStep];
    }
  }

  private proceedToCheckout() {
    console.log('🎯 Procedendo al checkout multi-segmento con:', this.steps);
    
    // Combina tutti i posti selezionati da tutti i segmenti
    const allSelectedSeats = this.steps.flatMap(step => step.selectedSeats);
    const allFlightIds = this.steps.map(step => step.flightId);
    
    // Naviga al checkout con dati multi-segmento
    this.router.navigate(['/checkout'], {
      state: {
        selectedSeats: allSelectedSeats,
        flightIds: allFlightIds,
        connection: this.connection,
        isMultiSegment: true
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
