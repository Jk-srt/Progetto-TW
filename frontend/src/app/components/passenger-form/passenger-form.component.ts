import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SeatService } from '../../services/seat.service';
import { PassengerData, SeatSelectionState } from '../../models/seat.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-passenger-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="passenger-form-container">
      <div class="form-header">
        <h2>Dati Passeggeri</h2>
        <p>Inserisci i dati per i {{ selectionState.selectedSeats.length }} posti selezionati</p>
        
        <!-- Countdown timer -->
        <div class="reservation-timer" *ngIf="countdown > 0">
          <div class="timer-alert">
            <i class="timer-icon">⏰</i>
            <span>Prenotazione scade tra: {{ formatCountdown(countdown) }}</span>
          </div>
        </div>
      </div>

      <!-- Posti selezionati recap -->
      <div class="selected-seats-recap">
        <h3>Posti Selezionati</h3>
        <div class="seats-grid">
          <div class="seat-card" *ngFor="let seat of selectionState.selectedSeats; let i = index">
            <div class="seat-info">
              <span class="seat-number">{{ seat.seat_number }}</span>
              <span class="seat-class">{{ seat.seat_class | titlecase }}</span>
            </div>
            <div class="passenger-assignment">
              Passeggero {{ i + 1 }}
            </div>
          </div>
        </div>
      </div>

      <!-- Forma passeggeri -->
      <form [formGroup]="passengerForm" (ngSubmit)="onSubmit()" class="passengers-form">
        
        <!-- Checkbox per utente loggato -->
        <div class="user-login-section" *ngIf="!currentUser">
          <div class="login-prompt">
            <p>
              <strong>Hai già un account?</strong> 
              <a href="#" (click)="requestLogin.emit()" class="login-link">Accedi qui</a> 
              per compilare automaticamente i tuoi dati.
            </p>
          </div>
        </div>

        <!-- Info utente loggato -->
        <div class="current-user-info" *ngIf="currentUser">
          <div class="user-card">
            <h4>Account: {{ currentUser.first_name }} {{ currentUser.last_name }}</h4>
            <p>{{ currentUser.email }}</p>
            <button type="button" class="btn btn-link" (click)="useCurrentUserData()">
              Usa i miei dati per il primo passeggero
            </button>
          </div>
        </div>

        <!-- Form array per i passeggeri -->
        <div formArrayName="passengers" class="passengers-list">
          <div 
            *ngFor="let passengerGroup of passengersFormArray.controls; let i = index"
            [formGroupName]="i"
            class="passenger-card">
            
            <div class="passenger-header">
              <h4>Passeggero {{ i + 1 }} - Posto {{ getSeatNumber(i) }}</h4>
              <span class="seat-class-badge">{{ getSeatClass(i) | titlecase }}</span>
            </div>

            <div class="passenger-form-grid">
              <!-- Nome completo -->
              <div class="form-group full-width">
                <label for="name_{{ i }}">Nome completo *</label>
                <input 
                  id="name_{{ i }}"
                  type="text" 
                  formControlName="name"
                  placeholder="es. Mario Rossi"
                  class="form-control"
                  [class.error]="isFieldInvalid(i, 'name')">
                <div class="error-message" *ngIf="isFieldInvalid(i, 'name')">
                  Il nome è obbligatorio
                </div>
              </div>

              <!-- Email -->
              <div class="form-group">
                <label for="email_{{ i }}">Email</label>
                <input 
                  id="email_{{ i }}"
                  type="email" 
                  formControlName="email"
                  placeholder="mario.rossi@email.com"
                  class="form-control"
                  [class.error]="isFieldInvalid(i, 'email')">
                <div class="error-message" *ngIf="isFieldInvalid(i, 'email')">
                  Inserisci un'email valida
                </div>
              </div>

              <!-- Telefono -->
              <div class="form-group">
                <label for="phone_{{ i }}">Telefono</label>
                <input 
                  id="phone_{{ i }}"
                  type="tel" 
                  formControlName="phone"
                  placeholder="+39 123 456 7890"
                  class="form-control">
              </div>

              <!-- Tipo documento -->
              <div class="form-group">
                <label for="document_type_{{ i }}">Tipo documento *</label>
                <select 
                  id="document_type_{{ i }}"
                  formControlName="document_type"
                  class="form-control"
                  [class.error]="isFieldInvalid(i, 'document_type')">
                  <option value="passport">Passaporto</option>
                  <option value="id_card">Carta d'identità</option>
                  <option value="driving_license">Patente</option>
                </select>
              </div>

              <!-- Numero documento -->
              <div class="form-group">
                <label for="document_number_{{ i }}">Numero documento</label>
                <input 
                  id="document_number_{{ i }}"
                  type="text" 
                  formControlName="document_number"
                  placeholder="ABC123456"
                  class="form-control">
              </div>

              <!-- Data di nascita -->
              <div class="form-group">
                <label for="date_of_birth_{{ i }}">Data di nascita</label>
                <input 
                  id="date_of_birth_{{ i }}"
                  type="date" 
                  formControlName="date_of_birth"
                  class="form-control">
              </div>

              <!-- Nazionalità -->
              <div class="form-group">
                <label for="nationality_{{ i }}">Nazionalità</label>
                <input 
                  id="nationality_{{ i }}"
                  type="text" 
                  formControlName="nationality"
                  placeholder="Italiana"
                  class="form-control">
              </div>
            </div>
          </div>
        </div>

        <!-- Note importanti -->
        <div class="important-notes">
          <h4>⚠️ Note Importanti:</h4>
          <ul>
            <li>I dati inseriti devono corrispondere esattamente a quelli del documento di viaggio</li>
            <li>Per voli internazionali è obbligatorio il passaporto</li>
            <li>Controlla attentamente tutti i dati prima di confermare</li>
            <li>I posti selezionati scadranno automaticamente tra {{ formatCountdown(countdown) }}</li>
          </ul>
        </div>

        <!-- Azioni del form -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="goBack()">
            ← Torna alla Selezione Posti
          </button>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="!passengerForm.valid || submitting">
            <span *ngIf="submitting">Elaborazione...</span>
            <span *ngIf="!submitting">Conferma Prenotazione →</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./passenger-form.component.scss']
})
export class PassengerFormComponent implements OnInit, OnDestroy {
  @Input() currentUser?: User;
  @Input() flightId!: number;
  @Output() backToSeatSelection = new EventEmitter<void>();
  @Output() bookingConfirmed = new EventEmitter<{ passengers: PassengerData[], bookingId?: number }>();
  @Output() requestLogin = new EventEmitter<void>();

  passengerForm!: FormGroup;
  selectionState: SeatSelectionState = {
    selectedSeats: [],
    sessionId: '',
    passengers: []
  };
  countdown = 0;
  submitting = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private seatService: SeatService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.subscribeToSelectionState();
    this.subscribeToCountdown();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeForm(): void {
    this.passengerForm = this.fb.group({
      passengers: this.fb.array([])
    });
  }

  private subscribeToSelectionState(): void {
    const sub = this.seatService.seatSelection$.subscribe(state => {
      this.selectionState = state;
      this.updatePassengerForms();
    });
    this.subscriptions.push(sub);
  }

  private subscribeToCountdown(): void {
    const sub = this.seatService.countdown$.subscribe(countdown => {
      this.countdown = countdown;
      if (countdown <= 0) {
        // Prenotazione scaduta, torna alla selezione posti
        this.goBack();
      }
    });
    this.subscriptions.push(sub);
  }

  get passengersFormArray(): FormArray {
    return this.passengerForm.get('passengers') as FormArray;
  }

  private updatePassengerForms(): void {
    const currentPassengers = this.passengersFormArray.length;
    const requiredPassengers = this.selectionState.selectedSeats.length;

    // Aggiungi o rimuovi form in base ai posti selezionati
    if (currentPassengers < requiredPassengers) {
      for (let i = currentPassengers; i < requiredPassengers; i++) {
        this.addPassengerForm(this.selectionState.passengers[i] || this.createEmptyPassenger());
      }
    } else if (currentPassengers > requiredPassengers) {
      for (let i = currentPassengers - 1; i >= requiredPassengers; i--) {
        this.passengersFormArray.removeAt(i);
      }
    }
  }

  private addPassengerForm(passenger: PassengerData): void {
    const passengerGroup = this.fb.group({
      name: [passenger.name || '', Validators.required],
      email: [passenger.email || '', [Validators.email]],
      phone: [passenger.phone || ''],
      document_type: [passenger.document_type || 'passport', Validators.required],
      document_number: [passenger.document_number || ''],
      date_of_birth: [passenger.date_of_birth || ''],
      nationality: [passenger.nationality || '']
    });

    this.passengersFormArray.push(passengerGroup);
  }

  private createEmptyPassenger(): PassengerData {
    return {
      name: '',
      email: '',
      phone: '',
      document_type: 'passport',
      document_number: '',
      date_of_birth: '',
      nationality: ''
    };
  }

  useCurrentUserData(): void {
    if (!this.currentUser || this.passengersFormArray.length === 0) return;

    const firstPassengerForm = this.passengersFormArray.at(0);
    firstPassengerForm.patchValue({
      name: `${this.currentUser.first_name} ${this.currentUser.last_name}`,
      email: this.currentUser.email,
      phone: this.currentUser.phone || '',
      nationality: 'Italiana' // Default, può essere modificato
    });
  }

  isFieldInvalid(passengerIndex: number, fieldName: string): boolean {
    const passengerForm = this.passengersFormArray.at(passengerIndex);
    const field = passengerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  formatCountdown(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  goBack(): void {
    this.backToSeatSelection.emit();
  }

  onSubmit(): void {
    if (!this.passengerForm.valid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.submitting = true;
    const passengersData: PassengerData[] = this.passengerForm.value.passengers;
    
    // Simula chiamata API per creare booking
    // In un'implementazione reale, prima creeresti il booking, poi confermeresti i posti
    const mockBookingId = Math.floor(Math.random() * 10000) + 1000;
    
    const seatIds = this.selectionState.selectedSeats.map(seat => seat.seat_id);
    
    const sub = this.seatService.confirmBooking(mockBookingId, this.flightId, seatIds, passengersData)
      .subscribe({
        next: (response) => {
          this.submitting = false;
          if (response.success) {
            this.bookingConfirmed.emit({ 
              passengers: passengersData, 
              bookingId: response.booking_id 
            });
          } else {
            alert('Errore nella conferma della prenotazione: ' + response.message);
          }
        },
        error: (error) => {
          this.submitting = false;
          console.error('Errore nella conferma prenotazione:', error);
          alert('Errore nella conferma della prenotazione. Riprova.');
        }
      });
    
    this.subscriptions.push(sub);
  }

  private markAllFieldsAsTouched(): void {
    this.passengersFormArray.controls.forEach(passengerForm => {
      Object.keys((passengerForm as FormGroup).controls).forEach(key => {
        passengerForm.get(key)?.markAsTouched();
      });
    });
  }

  getSeatNumber(index: number): string {
    if (this.selectionState.selectedSeats && this.selectionState.selectedSeats[index]) {
      return this.selectionState.selectedSeats[index].seat_number || '';
    }
    return '';
  }

  getSeatClass(index: number): string {
    if (this.selectionState.selectedSeats && this.selectionState.selectedSeats[index]) {
      return this.selectionState.selectedSeats[index].seat_class || '';
    }
    return '';
  }
}
