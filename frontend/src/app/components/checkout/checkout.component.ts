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
      <!-- Contenuto principale del checkout -->
      <div class="checkout-content">
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
  
  // Subscription per il cleanup
  userSubscription?: Subscription;
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
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private initializeForm(): void {
    const passengersArray: FormGroup[] = [];
    
    // Crea un form per ogni posto selezionato
    this.checkoutData?.selectedSeats.forEach((seat, index) => {
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
    });

    this.checkoutForm = this.fb.group({
      passengers: this.fb.array(passengersArray)
    });

    // Mostra un messaggio se i dati sono stati auto-compilati
    if (this.currentUser && this.checkoutData?.selectedSeats && this.checkoutData.selectedSeats.length > 0) {
      const seatCount = this.checkoutData.selectedSeats.length;
      const message = seatCount > 1 
        ? `Abbiamo compilato automaticamente i tuoi dati per tutti i ${seatCount} passeggeri. Puoi modificarli se necessario.`
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
    return this.checkoutForm.get('passengers') as FormArray;
  }

  getPassengerControl(index: number, controlName: string) {
    return this.passengersFormArray.at(index).get(controlName);
  }

  getSeatPrice(seat: FlightSeatMap): number {
    if (!this.checkoutData?.flight) return 0;
    
    const flight = this.checkoutData.flight;
    
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
      passengers: bookingData.passengers.map((passenger: any, index: number) => ({
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        email: passenger.email || mainPassenger.email,
        phone: passenger.phone || mainPassenger.phone,
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
