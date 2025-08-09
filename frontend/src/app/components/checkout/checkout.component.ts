import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SeatService } from '../../services/seat.service';
import { AuthService, User } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { FlightSeatMap, SeatSelectionState } from '../../models/seat.model';
import { environment } from '@environments/environment';

interface CheckoutData {
  flightId?: number;
  selectedSeats?: FlightSeatMap[];
  sessionId?: string;
  flight?: any;
  
  // Supporto per voli multi-segmento
  isMultiSegment?: boolean;
  connection?: any;
  segments?: any[];
  flightIds?: number[];
  totalPrice?: number;
  
  // Supporto per voli con scalo semplici
  isConnectionFlight?: boolean;
  firstFlight?: {
    flightId: number;
    selectedSeats: FlightSeatMap[];
    sessionId: string;
    flight: any;
  };
  secondFlight?: {
    flightId: number;
    selectedSeats: FlightSeatMap[];
    sessionId: string;
    flight: any;
  };
}

interface PassengerForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  documentType: string;
  documentNumber: string;
  nationality: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="checkout-container">
      <!-- Contenuto principale del checkout -->
      <div class="checkout-content">
        <!-- Header con dettagli volo -->
        <div class="flight-summary">
          <h1>Finalizza la tua prenotazione</h1>
          
          <!-- Volo singolo -->
          <div class="flight-info" *ngIf="checkoutData?.flight && !checkoutData?.isMultiSegment && !checkoutData?.isConnectionFlight">
            <div class="flight-header">
              <h2>{{ checkoutData?.flight?.flight_number }} - {{ checkoutData?.flight?.airline_name }}</h2>
              <span class="flight-price">€{{ getTotalPrice() }}</span>
            </div>
            <div class="flight-details">
              <div class="route">
                <span class="departure">
                  {{ checkoutData?.flight?.departure_code }} {{ checkoutData?.flight?.departure_city }}
                </span>
                <span class="arrow">→</span>
                <span class="arrival">
                  {{ checkoutData?.flight?.arrival_code }} {{ checkoutData?.flight?.arrival_city }}
                </span>
              </div>
              <div class="datetime">
                {{ formatDateTime(checkoutData?.flight?.departure_time) }}
              </div>
            </div>
          </div>

          <!-- Volo con scalo (semplice) -->
          <div class="connection-flight-info" *ngIf="checkoutData?.isConnectionFlight && checkoutData?.firstFlight && checkoutData?.secondFlight">
            <div class="flight-header">
              <h2>🔗 Volo con Scalo</h2>
              <span class="flight-price">€{{ getTotalPrice() }}</span>
            </div>
            <div class="connection-details">
              <div class="segment">
                <h4>Primo Volo</h4>
                <div class="route">
                  <span class="departure">
                    {{ checkoutData?.firstFlight?.flight?.departure_code }} {{ checkoutData?.firstFlight?.flight?.departure_city }}
                  </span>
                  <span class="arrow">→</span>
                  <span class="arrival">
                    {{ checkoutData?.firstFlight?.flight?.arrival_code }} {{ checkoutData?.firstFlight?.flight?.arrival_city }}
                  </span>
                </div>
                <div class="flight-number">{{ checkoutData?.firstFlight?.flight?.flight_number }}</div>
                <div class="datetime">{{ formatDateTime(checkoutData?.firstFlight?.flight?.departure_time) }}</div>
              </div>
              <div class="stopover">🔄 SCALO</div>
              <div class="segment">
                <h4>Secondo Volo</h4>
                <div class="route">
                  <span class="departure">
                    {{ checkoutData?.secondFlight?.flight?.departure_code }} {{ checkoutData?.secondFlight?.flight?.departure_city }}
                  </span>
                  <span class="arrow">→</span>
                  <span class="arrival">
                    {{ checkoutData?.secondFlight?.flight?.arrival_code }} {{ checkoutData?.secondFlight?.flight?.arrival_city }}
                  </span>
                </div>
                <div class="flight-number">{{ checkoutData?.secondFlight?.flight?.flight_number }}</div>
                <div class="datetime">{{ formatDateTime(checkoutData?.secondFlight?.flight?.departure_time) }}</div>
              </div>
            </div>
          </div>

          <!-- Volo multi-segmento -->
          <div class="multi-segment-info" *ngIf="checkoutData?.isMultiSegment && checkoutData?.connection">
            <div class="flight-header">
              <h2>🔗 Volo con Scalo</h2>
              <span class="flight-price">€{{ getTotalPrice() }}</span>
            </div>
            <div class="connection-details">
              <div class="segment">
                <h4>Segmento 1</h4>
                <div class="route">
                  <span class="departure">{{ outboundDepartureCity }}</span>
                  <span class="arrow">→</span>
                  <span class="arrival">{{ outboundArrivalCity }}</span>
                </div>
                <div class="flight-number">Volo: {{ outboundFlightNumber }}</div>
              </div>
              <div class="stopover">🔄 SCALO</div>
              <div class="segment">
                <h4>Segmento 2</h4>
                <div class="route">
                  <span class="departure">{{ connectionDepartureCity }}</span>
                  <span class="arrow">→</span>
                  <span class="arrival">{{ connectionArrivalCity }}</span>
                </div>
                <div class="flight-number">Volo: {{ connectionFlightNumber }}</div>
              </div>
            </div>
            <div class="total-duration">
              <strong>Durata totale: {{ totalConnectionDuration }}</strong>
            </div>
          </div>

          <!-- Posti selezionati -->
          <div class="selected-seats" *ngIf="!checkoutData?.isMultiSegment && !checkoutData?.isConnectionFlight">
            <h3>Posti selezionati ({{ checkoutData?.selectedSeats?.length || 0 }})</h3>
            <div class="seats-list">
              <div class="seat-item" *ngFor="let seat of checkoutData?.selectedSeats">
                <span class="seat-number">{{ seat.seat_number }}</span>
                <span class="seat-class">{{ seat.seat_class | titlecase }}</span>
                <span class="seat-price">€{{ getSeatPrice(seat) }}</span>
              </div>
            </div>
          </div>

          <!-- Posti per volo con scalo -->
          <div class="connection-seats" *ngIf="checkoutData?.isConnectionFlight">
            <h3>Posti selezionati</h3>
            <div class="connection-segments">
              <div class="segment-seats">
                <h4>Primo Volo - {{ checkoutData?.firstFlight?.flight?.flight_number }}</h4>
                <div class="seats-list">
                  <div class="seat-item" *ngFor="let seat of checkoutData?.firstFlight?.selectedSeats">
                    <span class="seat-number">{{ seat.seat_number }}</span>
                    <span class="seat-class">{{ seat.seat_class | titlecase }}</span>
                    <span class="seat-price">€{{ getSeatPrice(seat, checkoutData?.firstFlight?.flight) }}</span>
                  </div>
                </div>
              </div>
              <div class="segment-seats">
                <h4>Secondo Volo - {{ checkoutData?.secondFlight?.flight?.flight_number }}</h4>
                <div class="seats-list">
                  <div class="seat-item" *ngFor="let seat of checkoutData?.secondFlight?.selectedSeats">
                    <span class="seat-number">{{ seat.seat_number }}</span>
                    <span class="seat-class">{{ seat.seat_class | titlecase }}</span>
                    <span class="seat-price">€{{ getSeatPrice(seat, checkoutData?.secondFlight?.flight) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Info per voli multi-segmento -->
          <div class="multi-segment-seats" *ngIf="checkoutData?.isMultiSegment">
            <h3>Prenotazione Multi-Segmento</h3>
            <p>I posti per entrambi i segmenti sono stati prenotati automaticamente.</p>
            <div class="segments-summary" *ngIf="checkoutData?.segments">
              <div class="segment-item" *ngFor="let segment of checkoutData?.segments; let i = index">
                <span class="segment-label">Segmento {{ i + 1 }}:</span>
                <span class="segment-flight">{{ segment.flightNumber }}</span>
                <span class="segment-price">€{{ segment.price }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Form passeggeri -->
        <div class="passengers-section">
          <h2>Dati passeggeri</h2>
          <form [formGroup]="checkoutForm" (ngSubmit)="onSubmit()">
            <div class="passengers-forms" formArrayName="passengers">
              <div 
                class="passenger-form" 
                *ngFor="let passengerForm of passengersFormArray.controls; let i = index"
                [formGroupName]="i">
                
                <h3>Passeggero {{ i + 1 }} - Posto {{ checkoutData?.selectedSeats?.[i]?.seat_number || 'N/A' }}</h3>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="firstName_{{i}}">Nome *</label>
                    <input 
                      type="text" 
                      id="firstName_{{i}}"
                      formControlName="firstName"
                      placeholder="Nome">
                    <div class="error" *ngIf="getPassengerControl(i, 'firstName')?.invalid && getPassengerControl(i, 'firstName')?.touched">
                      Nome obbligatorio
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="lastName_{{i}}">Cognome *</label>
                    <input 
                      type="text" 
                      id="lastName_{{i}}"
                      formControlName="lastName"
                      placeholder="Cognome">
                    <div class="error" *ngIf="getPassengerControl(i, 'lastName')?.invalid && getPassengerControl(i, 'lastName')?.touched">
                      Cognome obbligatorio
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="dateOfBirth_{{i}}">Data di nascita *</label>
                    <input 
                      type="date" 
                      id="dateOfBirth_{{i}}"
                      formControlName="dateOfBirth">
                    <div class="error" *ngIf="getPassengerControl(i, 'dateOfBirth')?.invalid && getPassengerControl(i, 'dateOfBirth')?.touched">
                      Data di nascita obbligatoria
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="nationality_{{i}}">Nazionalità *</label>
                    <select id="nationality_{{i}}" formControlName="nationality">
                      <option value="">Seleziona nazionalità</option>
                      <option value="IT">Italia</option>
                      <option value="FR">Francia</option>
                      <option value="DE">Germania</option>
                      <option value="ES">Spagna</option>
                      <option value="UK">Regno Unito</option>
                      <option value="US">Stati Uniti</option>
                      <option value="OTHER">Altra</option>
                    </select>
                    <div class="error" *ngIf="getPassengerControl(i, 'nationality')?.invalid && getPassengerControl(i, 'nationality')?.touched">
                      Nazionalità obbligatoria
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="documentType_{{i}}">Tipo documento *</label>
                    <select id="documentType_{{i}}" formControlName="documentType">
                      <option value="">Seleziona tipo</option>
                      <option value="passport">Passaporto</option>
                      <option value="id_card">Carta d'identità</option>
                      <option value="driving_license">Patente</option>
                    </select>
                    <div class="error" *ngIf="getPassengerControl(i, 'documentType')?.invalid && getPassengerControl(i, 'documentType')?.touched">
                      Tipo documento obbligatorio
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="documentNumber_{{i}}">Numero documento *</label>
                    <input 
                      type="text" 
                      id="documentNumber_{{i}}"
                      formControlName="documentNumber"
                      placeholder="Numero documento">
                    <div class="error" *ngIf="getPassengerControl(i, 'documentNumber')?.invalid && getPassengerControl(i, 'documentNumber')?.touched">
                      Numero documento obbligatorio
                    </div>
                  </div>
                </div>

                <!-- Dati di contatto solo per il primo passeggero -->
                <div class="contact-section" *ngIf="i === 0">
                  <h4>Dati di contatto</h4>
                  <div class="form-row">
                    <div class="form-group">
                      <label for="email_{{i}}">Email *</label>
                      <input 
                        type="email" 
                        id="email_{{i}}"
                        formControlName="email"
                        placeholder="email@esempio.com">
                      <div class="error" *ngIf="getPassengerControl(i, 'email')?.invalid && getPassengerControl(i, 'email')?.touched">
                        Email valida obbligatoria
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label for="phone_{{i}}">Telefono *</label>
                      <input 
                        type="tel" 
                        id="phone_{{i}}"
                        formControlName="phone"
                        placeholder="+39 123 456 7890">
                      <div class="error" *ngIf="getPassengerControl(i, 'phone')?.invalid && getPassengerControl(i, 'phone')?.touched">
                        Telefono obbligatorio
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Riepilogo prezzo -->
            <div class="price-summary">
              <h3>Riepilogo prezzo</h3>
              <div class="price-breakdown">
                <div class="price-item" *ngFor="let seat of checkoutData?.selectedSeats">
                  <span>Posto {{ seat.seat_number }} ({{ seat.seat_class | titlecase }})</span>
                  <span>€{{ getSeatPrice(seat) }}</span>
                </div>
                <div class="price-total">
                  <strong>
                    <span>Totale</span>
                    <span>€{{ getTotalPrice() }}</span>
                  </strong>
                </div>
              </div>
            </div>

            <!-- Pulsanti azione -->
            <div class="checkout-actions">
              <button type="button" class="btn btn-secondary" (click)="goBackToSeats()">
                ← Modifica posti
              </button>
              <button 
                type="submit" 
                class="btn btn-primary btn-large"
                [disabled]="checkoutForm.invalid || isProcessing">
                <span *ngIf="isProcessing">Elaborazione...</span>
                <span *ngIf="!isProcessing">Conferma e paga €{{ getTotalPrice() }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  checkoutData: CheckoutData | null = null;
  checkoutForm!: FormGroup;
  isProcessing = false;
  isLoadingUserData = false;
  currentUser: User | null = null;
  
  // Subscription per il cleanup
  userSubscription?: Subscription;
  private baseUrl = `${environment.apiUrl}`;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private seatService: SeatService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private http: HttpClient
  ) {
    // Recupera i dati dal navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.checkoutData = navigation.extras.state as CheckoutData;
    }
  }

  ngOnInit(): void {
    if (!this.checkoutData) {
      // Se non ci sono dati, torna alla home
      this.router.navigate(['/']);
      return;
    }

    // Normalizza: se abbiamo entrambe le tratte, marchia come volo con scalo
    if (this.checkoutData.firstFlight && this.checkoutData.secondFlight) {
      this.checkoutData.isConnectionFlight = true;
    }

    // Sottoscrizione ai dati dell'utente corrente
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.initializeForm();
    });

    this.loadFlightDetails();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private initializeForm(): void {
    const passengersArray: FormGroup[] = [];
    
    // Determina il numero di passeggeri basato sui dati disponibili
    let numberOfPassengers = 1;
    if (this.checkoutData?.isConnectionFlight) {
      // Per voli con scalo, usa il numero di posti del primo volo
      numberOfPassengers = this.checkoutData.firstFlight?.selectedSeats?.length || 1;
    } else if (this.checkoutData?.selectedSeats && Array.isArray(this.checkoutData.selectedSeats) && this.checkoutData.selectedSeats.length > 0) {
      numberOfPassengers = this.checkoutData.selectedSeats.length;
    } else if (this.checkoutData?.isMultiSegment) {
      // Per voli multi-segmento, assumiamo 1 passeggero per ora
      numberOfPassengers = 1;
    }
    
    // Crea un form per ogni passeggero
    for (let index = 0; index < numberOfPassengers; index++) {
      // Auto-compilazione per tutti i passeggeri se l'utente è autenticato
      const isMainPassenger = index === 0;
      const userData = this.authService.getUserInfoForAutoFill(); // Usa il nuovo metodo che restituisce null per ospiti
      
      const passengerForm = this.fb.group({
        firstName: [
          userData?.first_name || '', 
          Validators.required
        ],
        lastName: [
          userData?.last_name || '', 
          Validators.required
        ],
        dateOfBirth: [
          userData?.date_of_birth || '', 
          Validators.required
        ],
        documentType: ['', Validators.required],
        documentNumber: ['', Validators.required],
        nationality: [
          userData?.nationality || '', 
          Validators.required
        ],
        email: [
          userData?.email || '',
          isMainPassenger ? [Validators.required, Validators.email] : []
        ],
        phone: [
          userData?.phone || '',
          isMainPassenger ? [Validators.required] : []
        ]
      });
      
      passengersArray.push(passengerForm);
    }

    this.checkoutForm = this.fb.group({
      passengers: this.fb.array(passengersArray)
    });

    // Mostra un messaggio se i dati sono stati auto-compilati
    if (this.currentUser) {
      const message = this.checkoutData?.isMultiSegment 
        ? 'Abbiamo compilato automaticamente i tuoi dati per la prenotazione multi-segmento. Puoi modificarli se necessario.'
        : numberOfPassengers > 1 
          ? `Abbiamo compilato automaticamente i tuoi dati per tutti i ${numberOfPassengers} passeggeri. Puoi modificarli se necessario.`
          : 'Abbiamo compilato automaticamente i tuoi dati personali. Puoi modificarli se necessario.';
      
      this.notificationService.showInfo(
        'Dati auto-compilati', 
        message,
        4000
      );
    }
  }

  private loadFlightDetails(): void {
    // Carica i dettagli del volo se non sono già presenti
    if (!this.checkoutData?.flight && this.checkoutData?.flightId) {
      // Implementa la chiamata API per ottenere i dettagli del volo
      console.log('Loading flight details for ID:', this.checkoutData.flightId);
    }
  }

  get passengersFormArray(): FormArray {
    return this.checkoutForm?.get('passengers') as FormArray || this.fb.array([]);
  }

  // Metodi getter per accesso sicuro ai dati della connessione
  get outboundDepartureCity(): string {
    return this.checkoutData?.connection?.outboundFlight?.departure_city || '';
  }

  get outboundArrivalCity(): string {
    return this.checkoutData?.connection?.outboundFlight?.arrival_city || '';
  }

  get outboundFlightNumber(): string {
    return this.checkoutData?.connection?.outboundFlight?.flight_number || '';
  }

  get connectionDepartureCity(): string {
    return this.checkoutData?.connection?.connectionFlight?.departure_city || '';
  }

  get connectionArrivalCity(): string {
    return this.checkoutData?.connection?.connectionFlight?.arrival_city || '';
  }

  get connectionFlightNumber(): string {
    return this.checkoutData?.connection?.connectionFlight?.flight_number || '';
  }

  get totalConnectionDuration(): string {
    return this.checkoutData?.connection?.totalDuration || '';
  }

  getPassengerControl(index: number, controlName: string) {
    return this.passengersFormArray.at(index).get(controlName);
  }

  getSeatPrice(seat: FlightSeatMap, flightData?: any): number {
    // Per voli con scalo, usa il flightData passato come parametro
    const flight = flightData || this.checkoutData?.flight;
    if (!flight) return 0;
    
    // Usa i prezzi specifici per classe dal sistema route pricing + flight surcharge
    // Converte sempre i prezzi in numeri per evitare concatenazioni
    switch (seat.seat_class) {
      case 'economy':
        return parseFloat(flight.economy_price) || parseFloat(flight.price) || 0;
      case 'business':
        return parseFloat(flight.business_price) || (parseFloat(flight.price) * 1.5) || 0;
      case 'first':
        return parseFloat(flight.first_price) || (parseFloat(flight.price) * 2) || 0;
      default:
        return parseFloat(flight.economy_price) || parseFloat(flight.price) || 0;
    }
  }

  getTotalPrice(): number {
    // Se è un volo multi-segmento e abbiamo il prezzo totale
    if (this.checkoutData?.isMultiSegment && this.checkoutData?.totalPrice) {
      return this.checkoutData.totalPrice;
    }
    
    // Se è un volo con scalo, calcola il prezzo di entrambi i voli
    if (this.checkoutData?.isConnectionFlight) {
      let total = 0;
      
      // Primo volo
      if (this.checkoutData.firstFlight?.selectedSeats && this.checkoutData.firstFlight?.flight) {
        total += this.checkoutData.firstFlight.selectedSeats.reduce((sum, seat) => {
          return sum + this.getSeatPrice(seat, this.checkoutData!.firstFlight!.flight);
        }, 0);
      }
      
      // Secondo volo
      if (this.checkoutData.secondFlight?.selectedSeats && this.checkoutData.secondFlight?.flight) {
        total += this.checkoutData.secondFlight.selectedSeats.reduce((sum, seat) => {
          return sum + this.getSeatPrice(seat, this.checkoutData!.secondFlight!.flight);
        }, 0);
      }
      
      return total;
    }
    
    // Altrimenti calcola dai posti selezionati
    if (!this.checkoutData?.selectedSeats) return 0;
    
    return this.checkoutData.selectedSeats.reduce((total, seat) => {
      return total + this.getSeatPrice(seat);
    }, 0);
  }

  formatDateTime(dateTime: string): string {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  hasMultiplePassengers(): boolean {
    return (this.checkoutData?.selectedSeats?.length || 0) > 1;
  }

  goBackToSeats(): void {
    if (this.checkoutData?.flightId) {
      this.router.navigate(['/flights', this.checkoutData.flightId, 'seats']);
    }
  }

  goBackToFlights(): void {
    this.router.navigate(['/']);
  }

  onSubmit(): void {
    if (this.checkoutForm.valid) {
      this.isProcessing = true;
      
      const formData = this.checkoutForm.value;

      // Se volo con scalo, usa sempre il flusso dedicato
      if (this.checkoutData?.isConnectionFlight) {
        const b1 = this.checkoutData.firstFlight;
        const b2 = this.checkoutData.secondFlight;
        if (!b1 || !b2) {
          this.isProcessing = false;
          this.notificationService.showError('Dati mancanti', 'Dati del volo con scalo incompleti. Torna alla selezione posti.');
          return;
        }
        const booking1 = {
          flightId: b1.flightId,
          seats: b1.selectedSeats || [],
          passengers: formData.passengers,
          totalPrice: (b1.selectedSeats || []).reduce((sum: number, seat: any) => sum + this.getSeatPrice(seat, b1.flight), 0),
          sessionId: b1.sessionId
        };
        const booking2 = {
          flightId: b2.flightId,
          seats: b2.selectedSeats || [],
          passengers: formData.passengers,
          totalPrice: (b2.selectedSeats || []).reduce((sum: number, seat: any) => sum + this.getSeatPrice(seat, b2.flight), 0),
          sessionId: b2.sessionId
        };
        setTimeout(() => this.processConnectionBooking(booking1, booking2), 500);
        return; // Evita il flusso singolo
      }
  {
        const bookingData = {
          flightId: this.checkoutData?.flightId,
          seats: this.checkoutData?.selectedSeats || [],
          passengers: formData.passengers,
          totalPrice: this.getTotalPrice(),
          sessionId: this.checkoutData?.sessionId
        };

        // Simula elaborazione pagamento
        setTimeout(() => {
          this.processBooking(bookingData);
        }, 1000);
  }
    } else {
      // Marca tutti i campi come touched per mostrare gli errori
      this.markFormGroupTouched(this.checkoutForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private processBooking(bookingData: any): void {
    console.log('Processing booking:', bookingData);
    console.log('Total price calculated:', this.getTotalPrice());
    console.log('Selected seats:', this.checkoutData?.selectedSeats);
    console.log('Flight data:', this.checkoutData?.flight);
    
    // Debug dettagliato per ogni posto selezionato
    this.checkoutData?.selectedSeats?.forEach((seat, index) => {
      console.log(`Seat ${index + 1}:`, {
        seat_number: seat.seat_number,
        seat_class: seat.seat_class,
        seat_id: seat.seat_id,
        calculated_price: this.getSeatPrice(seat)
      });
    });
    
    // Debug flight pricing
    if (this.checkoutData?.flight) {
      console.log('Flight pricing details:', {
        economy_price: this.checkoutData.flight.economy_price,
        business_price: this.checkoutData.flight.business_price,
        first_price: this.checkoutData.flight.first_price,
        price: this.checkoutData.flight.price
      });
    }
    
    // Prepara i dati per l'API backend
    const mainPassenger = bookingData.passengers[0];
    
    // Validazione aggiuntiva per dati critici
    if (!mainPassenger.email || !mainPassenger.phone) {
      this.isProcessing = false;
      this.notificationService.showError(
        'Dati mancanti',
        'Email e telefono sono obbligatori per completare la prenotazione.'
      );
      return;
    }
    
    const apiBookingData = {
      flight_id: bookingData.flightId,
      passengers: (bookingData.passengers || []).map((passenger: any, index: number) => ({
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        email: passenger.email || mainPassenger.email,
        phone: passenger.phone || mainPassenger.phone,
        document_type: passenger.documentType,
        document_number: passenger.documentNumber,
        date_of_birth: passenger.dateOfBirth,
        nationality: passenger.nationality,
        seat_id: (bookingData.seats && bookingData.seats[index]) ? bookingData.seats[index].seat_id : null
      })),
      total_price: bookingData.totalPrice,
      payment_method: 'credit_card',
      payment_status: 'completed'
    };

    console.log('API booking data:', apiBookingData);

    // Ottieni l'email del primo passeggero per la notifica
    const mainPassengerEmail = bookingData.passengers[0]?.email;
    const flightNumber = this.checkoutData?.flight?.flight_number || 'N/A';

    // Effettua la chiamata API reale
    const headers = this.getAuthHeaders();
    
    this.http.post<any>(`${this.baseUrl}/bookings`, apiBookingData, { headers })
      .subscribe({
        next: (response) => {
          this.isProcessing = false;
          console.log('Booking response received:', response);
          
          // Controlla sia response.success che response.booking_references per compatibilità
          if (response.success || response.booking_references) {
            // Gestisce sia singolo che multiplo booking reference
            const bookingRef = response.booking_references?.length > 0 
              ? response.booking_references[0] 
              : response.booking_reference || `BK${Date.now()}`;
            
            // Mostra notifica di successo con email
            this.notificationService.showBookingSuccess(
              bookingRef,
              mainPassengerEmail
            );
            
            // Aggiorna lo stato dei posti (li marca come prenotati)
            this.updateSeatsStatus(bookingData.seats || []);
            
            // Pulisce la selezione
            this.seatService.clearSelection();
            
            // Naviga alla pagina delle prenotazioni dopo 3 secondi
            setTimeout(() => {
              this.router.navigate(['/bookings']);
            }, 3000);
            
          } else {
            console.error('Booking failed - no success flag or booking reference');
            this.notificationService.showError(
              'Errore nella prenotazione',
              response.message || 'Si è verificato un errore durante la prenotazione'
            );
          }
        },
        error: (error) => {
          console.error('Booking HTTP error:', error);
          this.isProcessing = false;
          
          // Gestisci diversi tipi di errore
          let errorMessage = 'Si è verificato un errore durante la prenotazione. Riprova più tardi.';
          let errorTitle = 'Errore nella prenotazione';
          let shouldReturnToSeatSelection = false;
          
          if (error.status === 400 && error.error?.message) {
            // Errori di validazione/business logic dal backend
            errorMessage = error.error.message;
            
            // Controlla se l'errore è relativo a posti non più riservati
            if (error.error.message.includes('non è più riservato') || 
                error.error.message.includes('riserva') || 
                error.error.message.includes('scaduta')) {
              
              errorTitle = '⏰ Prenotazione Scaduta';
              errorMessage = 'La prenotazione temporanea dei posti è scaduta. I posti sono stati rilasciati e potrebbero essere stati prenotati da altri utenti.';
              shouldReturnToSeatSelection = true;
              
              // Pulisce la selezione scaduta
              this.seatService.clearSelection();
              
            } else if (error.error.message.includes('già prenotato') || 
                       error.error.message.includes('già stato prenotato') ||
                       error.error.message.includes('non disponibile')) {
              
              errorTitle = '🚫 Posto Non Disponibile';
              errorMessage = 'Uno o più posti selezionati sono stati prenotati da altri utenti mentre completavi la prenotazione. Seleziona posti diversi.';
              shouldReturnToSeatSelection = true;
              
              // Pulisce la selezione obsoleta
              this.seatService.clearSelection();
            }
          }
          
          // Mostra notifica di errore
          this.notificationService.showError(errorTitle, errorMessage);
          
          // Se necessario, torna alla selezione posti
          if (shouldReturnToSeatSelection) {
            setTimeout(() => {
              if (this.checkoutData?.flightId) {
                this.router.navigate(['/flights', this.checkoutData.flightId, 'seats'], {
                  queryParams: { 
                    error: 'reservation_expired',
                    message: 'Seleziona nuovi posti disponibili'
                  }
                });
              } else {
                this.router.navigate(['/flights']);
              }
            }, 3000);
          } else if (error.status === 500) {
            errorTitle = 'Errore interno del server';
            errorMessage = 'Si è verificato un problema interno. Il nostro team è stato notificato. Riprova tra qualche minuto.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          // Mostra sempre la notifica di errore
          if (!shouldReturnToSeatSelection) {
            this.notificationService.showError(errorTitle, errorMessage);
          }
        }
      });
  }

  // Prenotazioni in sequenza per voli con scalo
  private processConnectionBooking(booking1: any, booking2: any): void {
    console.log('Processing connection booking:', { booking1, booking2 });

    const mainPassenger = (booking1.passengers || [])[0];
    if (!mainPassenger?.email || !mainPassenger?.phone) {
      this.isProcessing = false;
      this.notificationService.showError('Dati mancanti', 'Email e telefono sono obbligatori per completare la prenotazione.');
      return;
    }

    const headers = this.getAuthHeaders();

    const toApiPayload = (booking: any) => ({
      flight_id: booking.flightId,
      passengers: (booking.passengers || []).map((p: any, i: number) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email || mainPassenger.email,
        phone: p.phone || mainPassenger.phone,
        document_type: p.documentType,
        document_number: p.documentNumber,
        date_of_birth: p.dateOfBirth,
        nationality: p.nationality,
        seat_id: (booking.seats && booking.seats[i]) ? booking.seats[i].seat_id : null
      })),
      total_price: booking.totalPrice,
      payment_method: 'credit_card',
      payment_status: 'completed'
    });

    const payload1 = toApiPayload(booking1);
    const payload2 = toApiPayload(booking2);

    // Prima prenotazione
    this.http.post<any>(`${this.baseUrl}/bookings`, payload1, { headers }).subscribe({
      next: (resp1) => {
        if (!(resp1.success || resp1.booking_references)) {
          throw new Error(resp1.message || 'Prenotazione primo volo fallita');
        }
        const ref1 = resp1.booking_references?.[0] || resp1.booking_reference;
        console.log('First segment booking successful:', ref1);

        // Seconda prenotazione
        this.http.post<any>(`${this.baseUrl}/bookings`, payload2, { headers }).subscribe({
          next: (resp2) => {
            this.isProcessing = false;
            if (!(resp2.success || resp2.booking_references)) {
              this.notificationService.showError('Errore', resp2.message || 'Prenotazione secondo volo fallita');
              return;
            }
            const ref2 = resp2.booking_references?.[0] || resp2.booking_reference;
            console.log('Second segment booking successful:', ref2);

            // Notifica combinata
            const mainPassengerEmail = mainPassenger.email;
            this.notificationService.showBookingSuccess(ref1, mainPassengerEmail);
            this.notificationService.showBookingSuccess(ref2, mainPassengerEmail);

            // Aggiorna lo stato posti per entrambi i voli
            this.updateSeatsStatus(booking1.seats || []);
            this.updateSeatsStatus(booking2.seats || []);

            // Pulisci selezione e naviga
            this.seatService.clearSelection();
            setTimeout(() => this.router.navigate(['/bookings']), 3000);
          },
          error: (error2) => {
            console.error('Second segment booking error:', error2);
            this.isProcessing = false;
            this.notificationService.showError('Errore secondo volo', error2.error?.message || error2.message || 'Prenotazione secondo volo fallita');
          }
        });
      },
      error: (error1) => {
        console.error('First segment booking error:', error1);
        this.isProcessing = false;
        this.notificationService.showError('Errore primo volo', error1.error?.message || error1.message || 'Prenotazione primo volo fallita');
      }
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  private updateSeatsStatus(seats: FlightSeatMap[]): void {
    // Nessuna chiamata API necessaria: il backend marca già i posti come "occupied" durante /bookings
    try {
      console.log('Skipping client-side seat update; backend already marked seats as occupied:',
        seats.map(s => s.seat_number).join(', ')
      );
    } catch {}
  }
}
