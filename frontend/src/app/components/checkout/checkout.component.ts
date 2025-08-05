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
  flightId: number;
  selectedSeats: FlightSeatMap[];
  sessionId: string;
  flight?: any;
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
      <!-- Timer di scadenza prenotazione -->
      <div class="reservation-timer" *ngIf="timeRemaining > 0">
        <div class="timer-alert">
          <i class="timer-icon">⏰</i>
          <strong>Attenzione!</strong> La tua prenotazione scadrà tra: 
          <span class="countdown">{{ formatTime(timeRemaining) }}</span>
        </div>
        <div class="timer-bar">
          <div class="timer-fill" [style.width.%]="getTimerPercentage()"></div>
        </div>
      </div>

      <!-- Timer scaduto -->
      <div class="timer-expired" *ngIf="timeRemaining <= 0">
        <div class="expired-alert">
          <i class="expired-icon">❌</i>
          <strong>Prenotazione scaduta!</strong>
          <p>Il tempo per completare la prenotazione è scaduto. I posti selezionati sono stati rilasciati.</p>
          <button class="btn btn-primary" (click)="goBackToFlights()">
            Torna alla ricerca voli
          </button>
        </div>
      </div>

      <!-- Contenuto principale del checkout -->
      <div class="checkout-content" *ngIf="timeRemaining > 0">
        <!-- Header con dettagli volo -->
        <div class="flight-summary">
          <h1>Finalizza la tua prenotazione</h1>
          <div class="flight-info" *ngIf="checkoutData?.flight">
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

          <!-- Posti selezionati -->
          <div class="selected-seats">
            <h3>Posti selezionati ({{ checkoutData?.selectedSeats?.length || 0 }})</h3>
            <div class="seats-list">
              <div class="seat-item" *ngFor="let seat of checkoutData?.selectedSeats">
                <span class="seat-number">{{ seat.seat_number }}</span>
                <span class="seat-class">{{ seat.seat_class | titlecase }}</span>
                <span class="seat-price">€{{ getSeatPrice(seat) }}</span>
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
  
  // Timer
  timeRemaining = 900; // 15 minuti in secondi
  initialTime = 900;
  timerSubscription?: Subscription;
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

    // Sottoscrizione ai dati dell'utente corrente
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.initializeForm();
    });

    this.loadFlightDetails();
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private initializeForm(): void {
    const passengersArray: FormGroup[] = [];
    
    // Crea un form per ogni posto selezionato
    this.checkoutData?.selectedSeats.forEach((seat, index) => {
      // Auto-compilazione per il primo passeggero SOLO se l'utente è autenticato (non ospite)
      const isMainPassenger = index === 0;
      const userData = this.authService.getUserInfoForAutoFill(); // Usa il nuovo metodo che restituisce null per ospiti
      
      const passengerForm = this.fb.group({
        firstName: [
          (isMainPassenger && userData?.first_name) ? userData.first_name : '', 
          Validators.required
        ],
        lastName: [
          (isMainPassenger && userData?.last_name) ? userData.last_name : '', 
          Validators.required
        ],
        dateOfBirth: [
          (isMainPassenger && userData?.date_of_birth) ? userData.date_of_birth : '', 
          Validators.required
        ],
        documentType: ['', Validators.required],
        documentNumber: ['', Validators.required],
        nationality: [
          (isMainPassenger && userData?.nationality) ? userData.nationality : '', 
          Validators.required
        ],
        email: [
          (isMainPassenger && userData?.email) ? userData.email : '',
          isMainPassenger ? [Validators.required, Validators.email] : []
        ],
        phone: [
          (isMainPassenger && userData?.phone) ? userData.phone : '',
          isMainPassenger ? [Validators.required] : []
        ]
      });
      
      passengersArray.push(passengerForm);
    });

    this.checkoutForm = this.fb.group({
      passengers: this.fb.array(passengersArray)
    });

    // Mostra un messaggio se i dati sono stati auto-compilati
    if (this.currentUser && this.checkoutData?.selectedSeats && this.checkoutData.selectedSeats.length > 0) {
      this.notificationService.showInfo(
        'Dati auto-compilati', 
        'Abbiamo compilato automaticamente i tuoi dati personali. Puoi modificarli se necessario.',
        3000
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

  private startTimer(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      this.timeRemaining--;
      
      if (this.timeRemaining <= 0) {
        this.handleTimerExpired();
      }
    });
  }

  private handleTimerExpired(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    
    // Rilascia automaticamente i posti selezionati
    this.seatService.clearSelection();
    alert('Il tempo per completare la prenotazione è scaduto. I posti sono stati rilasciati.');
  }

  get passengersFormArray(): FormArray {
    return this.checkoutForm.get('passengers') as FormArray;
  }

  getPassengerControl(index: number, controlName: string) {
    return this.passengersFormArray.at(index).get(controlName);
  }

  getSeatPrice(seat: FlightSeatMap): number {
    if (!this.checkoutData?.flight) return 0;
    
    const flight = this.checkoutData.flight;
    
    // Usa i prezzi specifici per classe dal sistema route pricing + flight surcharge
    switch (seat.seat_class) {
      case 'economy':
        return flight.economy_price || flight.price || 0;
      case 'business':
        return flight.business_price || (flight.price * 1.5) || 0;
      case 'first':
        return flight.first_price || (flight.price * 2) || 0;
      default:
        return flight.economy_price || flight.price || 0;
    }
  }

  getTotalPrice(): number {
    if (!this.checkoutData?.selectedSeats) return 0;
    
    return this.checkoutData.selectedSeats.reduce((total, seat) => {
      return total + this.getSeatPrice(seat);
    }, 0);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getTimerPercentage(): number {
    return (this.timeRemaining / this.initialTime) * 100;
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

  goBackToSeats(): void {
    if (this.checkoutData?.flightId) {
      this.router.navigate(['/flights', this.checkoutData.flightId, 'seats']);
    }
  }

  goBackToFlights(): void {
    this.router.navigate(['/flights']);
  }

  onSubmit(): void {
    if (this.checkoutForm.valid && this.timeRemaining > 0) {
      this.isProcessing = true;
      
      const formData = this.checkoutForm.value;
      const bookingData = {
        flightId: this.checkoutData?.flightId,
        seats: this.checkoutData?.selectedSeats,
        passengers: formData.passengers,
        totalPrice: this.getTotalPrice(),
        sessionId: this.checkoutData?.sessionId
      };

      // Simula elaborazione pagamento
      setTimeout(() => {
        this.processBooking(bookingData);
      }, 2000);
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
    
    // Prepara i dati per l'API backend
    const apiBookingData = {
      flight_id: bookingData.flightId,
      passengers: bookingData.passengers.map((passenger: any, index: number) => ({
        passenger_name: `${passenger.firstName} ${passenger.lastName}`,
        passenger_email: passenger.email || bookingData.passengers[0].email,
        passenger_phone: passenger.phone || bookingData.passengers[0].phone,
        document_type: passenger.documentType,
        document_number: passenger.documentNumber,
        date_of_birth: passenger.dateOfBirth,
        nationality: passenger.nationality,
        seat_id: bookingData.seats[index]?.seat_id || null
      })),
      total_price: bookingData.totalPrice,
      payment_method: 'credit_card',
      payment_status: 'completed'
    };

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
          
          // Controlla sia response.success che response.booking_reference per compatibilità
          if (response.success || response.booking_reference) {
            // Mostra notifica di successo con email
            this.notificationService.showBookingSuccess(
              response.booking_reference || `BK${Date.now()}`,
              mainPassengerEmail
            );
            
            // Aggiorna lo stato dei posti (li marca come prenotati)
            this.updateSeatsStatus(bookingData.seats);
            
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
          
          if (error.status === 400 && error.error?.message) {
            // Errori di validazione/business logic dal backend
            errorMessage = error.error.message;
            if (error.error.message.includes('già prenotato') || error.error.message.includes('già stato prenotato')) {
              errorTitle = 'Posto non disponibile';
              errorMessage = 'Il posto selezionato è già stato prenotato da un altro utente. Seleziona un altro posto.';
              // Torna alla selezione posti dopo l'errore
              setTimeout(() => {
                this.router.navigate(['/seat-selection'], { 
                  queryParams: { 
                    flightId: this.checkoutData?.flight?.id 
                  }
                });
              }, 3000);
            }
          } else if (error.status === 500) {
            errorTitle = 'Errore interno del server';
            errorMessage = 'Si è verificato un problema interno. Il nostro team è stato notificato. Riprova tra qualche minuto.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.notificationService.showError(errorTitle, errorMessage);
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
    // Aggiorna lo stato dei posti nel servizio globale
    seats.forEach(seat => {
      // Chiamata API per marcare il posto come prenotato
      this.http.put(`${this.baseUrl}/seats/${seat.seat_id}/book`, {}, {
        headers: this.getAuthHeaders()
      }).subscribe({
        next: (response) => {
          console.log(`Seat ${seat.seat_number} marked as booked`);
        },
        error: (error) => {
          console.error(`Error updating seat ${seat.seat_number}:`, error);
        }
      });
    });
  }
}
