import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeatService } from '../../services/seat.service';
import { FlightService } from '../../services/flight.service';
import { FlightSeatMap, SeatSelectionState } from '../../models/seat.model';
import { Flight } from '../../models/flight.model';

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="seat-selection-container">
      <div class="flight-info" *ngIf="flight">
        <h2>Selezione Posti - Volo {{ flight.flight_number }}</h2>
        <p>{{ flight.departure_airport }} → {{ flight.arrival_airport }}</p>
        <p>{{ flight.departure_time | date:'medium' }}</p>
      </div>

      <!-- Avviso per compagnie aeree -->
      <div class="airline-notice" *ngIf="isAirlineUser">
        <div class="alert alert-warning">
          <i class="warning-icon">⚠️</i>
          <strong>Accesso negato:</strong> Le compagnie aeree non possono effettuare prenotazioni di posti.
          <p>Questa funzionalità è riservata esclusivamente ai passeggeri.</p>
        </div>
      </div>

      <!-- Countdown timer per prenotazione temporanea -->
      <div class="reservation-timer" *ngIf="countdown > 0 && !isAirlineUser">
        <div class="timer-alert">
          <i class="timer-icon">⏰</i>
          <span>Prenotazione scade tra: {{ formatCountdown(countdown) }}</span>
        </div>
      </div>

      <!-- Legenda -->
      <div class="seat-legend">
        <div class="legend-item">
          <div class="seat-icon available"></div>
          <span>Disponibile</span>
        </div>
        <div class="legend-item">
          <div class="seat-icon selected"></div>
          <span>Selezionato</span>
        </div>
        <div class="legend-item">
          <div class="seat-icon my-reservation"></div>
          <span>Tua riserva (15 min)</span>
        </div>
        <div class="legend-item">
          <div class="seat-icon temporarily-reserved"></div>
          <span>Riservato (altri)</span>
        </div>
        <div class="legend-item">
          <div class="seat-icon booked"></div>
          <span>Occupato</span>
        </div>
      </div>

      <!-- Mappa posti -->
      <div class="aircraft-container" *ngIf="seatMap.length > 0">
        <!-- Parte anteriore dell'aereo -->
        <div class="aircraft-nose">
          <div class="nose-cone">
            <div class="nose-tip"></div>
            <div class="nose-body">
              <div class="nose-highlight"></div>
            </div>
            <div class="pitot-tubes">
              <div class="pitot-tube left"></div>
              <div class="pitot-tube right"></div>
            </div>
          </div>
          <div class="cockpit">
            <div class="cockpit-frame"></div>
            <div class="cockpit-windows">
              <div class="window captain">
                <div class="window-frame"></div>
                <div class="window-glare"></div>
              </div>
              <div class="window first-officer">
                <div class="window-frame"></div>
                <div class="window-glare"></div>
              </div>
            </div>
            <div class="cockpit-text">
              <span class="cockpit-label">Flight Deck</span>
              <div class="airline-logo">✈</div>
            </div>
          </div>
        </div>
        
        <!-- Fusoliera dell'aereo -->
        <div class="aircraft-fuselage">
          <div class="fuselage-left">
            <div class="fuselage-details">
              <div class="rivet-line"></div>
              <div class="panel-line"></div>
            </div>
          </div>
          <div class="fuselage-right">
            <div class="fuselage-details">
              <div class="rivet-line"></div>
              <div class="panel-line"></div>
            </div>
          </div>
          <div class="fuselage-center">
            <div class="registration-number">I-ABCD</div>
          </div>
          
          <div class="cabin">
            <!-- Header con indicatori di posizione -->
            <div class="cabin-header">
              <div class="position-indicators">
                <span class="position-label left">A B C</span>
                <span class="aisle-indicator">┈┈┈┈</span>
                <span class="position-label right">D E F</span>
              </div>
            </div>
            
            <!-- Sezioni business e economy separate -->
            <div class="seat-section" *ngFor="let section of getSeatSections()">
              <div class="section-header" *ngIf="section.class !== 'economy' || hasBusinessClass">
                <h4>
                  <span class="class-icon">{{ section.class === 'business' ? '💼' : section.class === 'first' ? '👑' : '🪑' }}</span>
                  {{ section.class | titlecase }} Class
                </h4>
              </div>
              
              <div class="seat-rows">
                <div class="seat-row" *ngFor="let row of section.rows">
                  <div class="row-number">{{ row.rowNumber }}</div>
                  
                  <div class="seats-container">
                    <!-- Lato sinistro (A, B, C) -->
                    <div class="seat-group left">
                      <div 
                        *ngFor="let seat of row.leftSeats" 
                        class="seat"
                        [ngClass]="{
                          'available': (seat.actual_status || seat.seat_status) === 'available',
                          'selected': isSelected(seat.seat_id),
                          'temporarily-reserved': (seat.actual_status || seat.seat_status) === 'temporarily_reserved',
                          'my-reservation': (seat.actual_status || seat.seat_status) === 'my_reservation',
                          'booked': (seat.actual_status || seat.seat_status) === 'booked' || (seat.actual_status || seat.seat_status) === 'occupied',
                          'window': seat.is_window,
                          'aisle': seat.is_aisle,
                          'emergency': seat.is_emergency_exit,
                          'disabled': !canSelectSeat(seat),
                          'business': seat.seat_class === 'business',
                          'first': seat.seat_class === 'first',
                          'economy': seat.seat_class === 'economy'
                        }"
                        [title]="getSeatTooltip(seat)"
                        (click)="onSeatClick(seat)">
                        <span class="seat-number">{{ seat.seat_number }}</span>
                        <i *ngIf="seat.is_emergency_exit" class="emergency-icon">⚠️</i>
                        <i *ngIf="seat.is_window" class="window-icon">🪟</i>
                      </div>
                    </div>
                    
                    <!-- Corridoio con indicatore -->
                    <div class="aisle">
                      <div class="aisle-carpet"></div>
                    </div>
                    
                    <!-- Lato destro (D, E, F) -->
                    <div class="seat-group right">
                      <div 
                        *ngFor="let seat of row.rightSeats" 
                        class="seat"
                        [ngClass]="{
                          'available': (seat.actual_status || seat.seat_status) === 'available',
                          'selected': isSelected(seat.seat_id),
                          'temporarily-reserved': (seat.actual_status || seat.seat_status) === 'temporarily_reserved',
                          'my-reservation': (seat.actual_status || seat.seat_status) === 'my_reservation',
                          'booked': (seat.actual_status || seat.seat_status) === 'booked' || (seat.actual_status || seat.seat_status) === 'occupied',
                          'window': seat.is_window,
                          'aisle': seat.is_aisle,
                          'emergency': seat.is_emergency_exit,
                          'disabled': !canSelectSeat(seat),
                          'business': seat.seat_class === 'business',
                          'first': seat.seat_class === 'first',
                          'economy': seat.seat_class === 'economy'
                        }"
                        [title]="getSeatTooltip(seat)"
                        (click)="onSeatClick(seat)">
                        <span class="seat-number">{{ seat.seat_number }}</span>
                        <i *ngIf="seat.is_emergency_exit" class="emergency-icon">⚠️</i>
                        <i *ngIf="seat.is_window" class="window-icon">🪟</i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Coda dell'aereo -->
        <div class="aircraft-tail">
          <div class="tail-section">
            <div class="tail-fin">
              <div class="airline-logo">{{ flight?.airline_name || 'AIRLINE' }}</div>
            </div>
          </div>
        </div>
        
        <!-- Motori -->
        <div class="aircraft-engines">
          <div class="engine left-engine"></div>
          <div class="engine right-engine"></div>
        </div>
        
        <!-- Ali -->
        <div class="aircraft-wings">
          <div class="wing left-wing">
            <div class="winglet left-winglet"></div>
          </div>
          <div class="wing right-wing">
            <div class="winglet right-winglet"></div>
          </div>
        </div>
      </div>

      <!-- Posti selezionati e summary -->
      <div class="selection-summary" *ngIf="selectionState.selectedSeats.length > 0">
        <h3>Posti Selezionati</h3>
        <div class="selected-seats-list">
          <div class="selected-seat-item" *ngFor="let seat of selectionState.selectedSeats">
            <span class="seat-info">
              {{ seat.seat_number }} ({{ seat.seat_class | titlecase }})
            </span>
            <button class="remove-seat-btn" (click)="removeSeat(seat.seat_id)">×</button>
          </div>
        </div>
        
        <div class="selection-actions">
          <button class="btn btn-secondary" (click)="clearSelection()">
            Cancella Selezione
          </button>
          <button 
            class="btn btn-primary" 
            (click)="proceedToPassengerInfo()"
            [disabled]="selectionState.selectedSeats.length === 0">
            Continua con i Dati Passeggeri
          </button>
        </div>
      </div>

      <!-- Messaggio se nessun posto disponibile -->
      <div class="no-seats-message" *ngIf="seatMap.length === 0 && !loading">
        <p>Nessun posto disponibile per questo volo.</p>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="loading">
        <p>Caricamento mappa posti...</p>
      </div>
    </div>
  `,
  styleUrls: ['./seat-selection.component.scss']
})
export class SeatSelectionComponent implements OnInit, OnDestroy {
  @Input() flight?: Flight;
  @Output() seatsSelected = new EventEmitter<number[]>();
  @Output() proceedToBooking = new EventEmitter<void>();

  flightId!: number;
  seatMap: FlightSeatMap[] = [];
  selectionState: SeatSelectionState = {
    selectedSeats: [],
    sessionId: '',
    passengers: []
  };
  countdown = 0;
  loading = false;
  hasBusinessClass = false;
  isAirlineUser = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private seatService: SeatService, 
    private flightService: FlightService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Ottieni l'ID del volo dai parametri della route
    this.route.params.subscribe(params => {
      this.flightId = Number(params['id']);
      
      // Controlla se l'utente è una compagnia aerea
      this.isAirlineUser = this.seatService.isAirlineUser();
      
      if (this.isAirlineUser) {
        // Se è una compagnia aerea, mostra messaggio di errore
        return;
      }
      
      this.loadSeatMap();
      this.subscribeToSelectionState();
      this.subscribeToCountdown();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadSeatMap(): void {
    this.loading = true;
    const sub = this.seatService.getFlightSeatMap(this.flightId).subscribe({
      next: (response) => {
        if (response.success) {
          this.seatMap = response.seats;
          this.hasBusinessClass = this.seatMap.some(seat => seat.seat_class === 'business');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento mappa posti:', error);
        this.loading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  private subscribeToSelectionState(): void {
    const sub = this.seatService.seatSelection$.subscribe(state => {
      this.selectionState = state;
      this.seatsSelected.emit(state.selectedSeats.map(s => s.seat_id));
    });
    this.subscriptions.push(sub);
  }

  private subscribeToCountdown(): void {
    const sub = this.seatService.countdown$.subscribe(countdown => {
      this.countdown = countdown;
    });
    this.subscriptions.push(sub);
  }

  // Organizza i posti in sezioni e righe
  getSeatSections(): any[] {
    const sections: any[] = [];
    const businessSeats = this.seatMap.filter(seat => seat.seat_class === 'business');
    const economySeats = this.seatMap.filter(seat => seat.seat_class === 'economy');

    if (businessSeats.length > 0) {
      sections.push({
        class: 'business',
        rows: this.organizeSeatsByRows(businessSeats)
      });
    }

    if (economySeats.length > 0) {
      sections.push({
        class: 'economy',
        rows: this.organizeSeatsByRows(economySeats)
      });
    }

    return sections;
  }

  private organizeSeatsByRows(seats: FlightSeatMap[]): any[] {
    const rowMap = new Map<number, FlightSeatMap[]>();
    
    seats.forEach(seat => {
      if (!rowMap.has(seat.seat_row)) {
        rowMap.set(seat.seat_row, []);
      }
      rowMap.get(seat.seat_row)!.push(seat);
    });

    const rows: any[] = [];
    rowMap.forEach((rowSeats, rowNumber) => {
      const sortedSeats = rowSeats.sort((a, b) => a.seat_column.localeCompare(b.seat_column));
      const leftSeats = sortedSeats.filter(seat => ['A', 'B', 'C'].includes(seat.seat_column));
      const rightSeats = sortedSeats.filter(seat => ['D', 'E', 'F'].includes(seat.seat_column));
      
      rows.push({
        rowNumber,
        leftSeats,
        rightSeats
      });
    });

    return rows.sort((a, b) => a.rowNumber - b.rowNumber);
  }

  onSeatClick(seat: FlightSeatMap): void {
    console.log('🖱️ Seat clicked:', seat);
    console.log('🔍 Can select seat:', this.canSelectSeat(seat));
    console.log('🔍 Seat status:', seat.seat_status);
    console.log('🔍 Is airline user:', this.isAirlineUser);
    console.log('🔑 JWT Token exists:', !!localStorage.getItem('token'));
    console.log('🔑 JWT Token value:', localStorage.getItem('token'));
    console.log('👤 User logged in:', !!localStorage.getItem('user'));
    
    if (!this.canSelectSeat(seat)) {
      console.log('❌ Cannot select seat');
      return;
    }

    if (this.isSelected(seat.seat_id)) {
      console.log('🗑️ Removing seat');
      this.removeSeat(seat.seat_id);
    } else {
      console.log('✅ Selecting seat');
      this.selectSeat(seat);
    }
  }

  private selectSeat(seat: FlightSeatMap): void {
    console.log('🎯 SelectSeat called with:', seat);
    // Usa il nuovo sistema automatico di prenotazione temporanea
    this.seatService.addSeatToSelection(seat);
    
    // Ricarica la mappa per aggiornare gli stati
    setTimeout(() => {
      this.loadSeatMap();
    }, 100);
  }

  removeSeat(seatId: number): void {
    // Usa il nuovo sistema automatico di rilascio prenotazione temporanea
    this.seatService.removeSeatFromSelection(seatId);
    
    // Ricarica la mappa per aggiornare gli stati
    setTimeout(() => {
      this.loadSeatMap();
    }, 100);
  }

  clearSelection(): void {
    this.seatService.clearSelection();
    this.loadSeatMap();
  }

  canSelectSeat(seat: FlightSeatMap): boolean {
    // Le compagnie aeree non possono selezionare posti
    if (this.isAirlineUser) {
      return false;
    }
    
    const status = seat.actual_status || seat.seat_status;
    return status === 'available' || status === 'my_reservation';
  }

  isSelected(seatId: number): boolean {
    return this.selectionState.selectedSeats.some(s => s.seat_id === seatId);
  }

  isSelectedByMe(seat: FlightSeatMap): boolean {
    return seat.is_my_reservation || seat.reserved_by_session === this.selectionState.sessionId;
  }

  getSeatTooltip(seat: FlightSeatMap): string {
    let tooltip = `Posto ${seat.seat_number} - ${seat.seat_class}`;
    
    if (seat.is_window) tooltip += ' (Finestrino)';
    if (seat.is_aisle) tooltip += ' (Corridoio)';
    if (seat.is_emergency_exit) tooltip += ' (Uscita emergenza)';
    
    const status = seat.actual_status || seat.seat_status;
    switch (status) {
      case 'available':
        tooltip += ' - Disponibile';
        break;
      case 'temporarily_reserved':
        tooltip += ' - Riservato temporaneamente da altro utente';
        break;
      case 'my_reservation':
        tooltip += ' - Riservato da te (15 min)';
        break;
      case 'booked':
      case 'occupied':
        tooltip += ' - Occupato';
        break;
    }
    
    return tooltip;
  }

  formatCountdown(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  proceedToPassengerInfo(): void {
    // Carica i dettagli del volo prima di navigare
    this.loadFlightDetails().then(flight => {
      // Naviga alla pagina di checkout con i dati del volo e posti selezionati
      this.router.navigate(['/checkout'], {
        state: {
          flightId: this.flightId,
          selectedSeats: this.selectionState.selectedSeats,
          sessionId: this.selectionState.sessionId,
          flight: flight
        }
      });
    });
  }

  private loadFlightDetails(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Se abbiamo già i dati del volo, li usiamo
      if (this.flight) {
        resolve(this.flight);
        return;
      }

      // Carica i dettagli del volo dal backend
      const sub = this.flightService.getFlightById(this.flightId.toString()).subscribe({
        next: (flight) => {
          this.flight = flight;
          resolve(flight);
        },
        error: (error) => {
          console.error('Errore nel caricamento dettagli volo:', error);
          reject(error);
        }
      });
      this.subscriptions.push(sub);
    });
  }
}
