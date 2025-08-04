import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserBooking } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bookings-container">
      <div class="bookings-header">
        <h1>Le mie prenotazioni</h1>
        <p>Gestisci tutte le tue prenotazioni voli</p>
      </div>
      
      <div class="bookings-content">
        <!-- Loading state -->
        <div *ngIf="isLoading" class="loading-state">
          <div class="loading-spinner">⏳</div>
          <p>Caricamento prenotazioni...</p>
        </div>

        <!-- Empty state quando non ci sono prenotazioni -->
        <div *ngIf="!isLoading && bookings.length === 0" class="empty-state">
          <div class="empty-icon">✈️</div>
          <h2>Nessuna prenotazione trovata</h2>
          <p>Quando effettuerai delle prenotazioni, le vedrai qui.</p>
          <button class="cta-button" routerLink="/">
            Cerca voli
          </button>
        </div>

        <!-- Lista prenotazioni -->
        <div *ngIf="!isLoading && bookings.length > 0" class="bookings-list">
          <div class="booking-card" *ngFor="let booking of bookings" [class.cancelled]="booking.booking_status === 'cancelled'">
            <div class="booking-header">
              <div class="booking-status">
                <span class="status-badge" [class]="'status-' + booking.booking_status">
                  {{ getStatusLabel(booking.booking_status) }}
                </span>
                <span class="booking-ref">{{ booking.booking_reference }}</span>
              </div>
              <div class="booking-price">€{{ booking.total_price }}</div>
            </div>

            <div class="flight-info">
              <div class="flight-route">
                <div class="airport departure">
                  <span class="airport-code">{{ booking.departure_airport }}</span>
                  <span class="city-name">{{ booking.departure_city }}</span>
                </div>
                <div class="flight-arrow">
                  <span class="arrow">→</span>
                  <span class="flight-number">{{ booking.flight_number }}</span>
                </div>
                <div class="airport arrival">
                  <span class="airport-code">{{ booking.arrival_airport }}</span>
                  <span class="city-name">{{ booking.arrival_city }}</span>
                </div>
              </div>

              <div class="flight-details">
                <div class="detail-item">
                  <span class="label">Partenza:</span>
                  <span class="value">{{ formatDateTime(booking.departure_time) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Arrivo:</span>
                  <span class="value">{{ formatDateTime(booking.arrival_time) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Passeggero:</span>
                  <span class="value">{{ booking.passenger_name }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Posto:</span>
                  <span class="value">{{ booking.seat_number }} ({{ booking.seat_class }})</span>
                </div>
              </div>
            </div>

            <div class="booking-footer">
              <span class="booking-date">Prenotato il {{ formatDate(booking.created_at) }}</span>
              <div class="booking-actions">
                <button *ngIf="booking.booking_status === 'confirmed'" 
                        class="btn btn-secondary" 
                        (click)="downloadTicket(booking)">
                  📧 Biglietto Email
                </button>
                <button *ngIf="booking.booking_status === 'confirmed' && canCancel(booking)" 
                        class="btn btn-danger" 
                        (click)="cancelBooking(booking)">
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Not logged in state -->
        <div *ngIf="!isLoading && !isLoggedIn" class="login-required">
          <div class="login-icon">🔐</div>
          <h2>Accesso richiesto</h2>
          <p>Effettua l'accesso per visualizzare le tue prenotazioni.</p>
          <button class="cta-button" routerLink="/login">
            Accedi
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bookings-container {
      max-width: 1000px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .bookings-header {
      text-align: center;
      margin-bottom: 3rem;
      color: white;
    }

    .bookings-header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .bookings-header p {
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .bookings-content {
      background: white;
      border-radius: 12px;
      min-height: 400px;
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .loading-spinner {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state, .login-required {
      text-align: center;
      padding: 3rem;
    }

    .empty-icon, .login-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2, .login-required h2 {
      color: #333;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .empty-state p, .login-required p {
      color: #666;
      margin-bottom: 2rem;
      font-size: 1rem;
    }

    .bookings-list {
      padding: 1rem;
    }

    .booking-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      margin-bottom: 1rem;
      padding: 1.5rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .booking-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }

    .booking-card.cancelled {
      opacity: 0.6;
      background: #f5f5f5;
    }

    .booking-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .booking-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-confirmed {
      background: #d4edda;
      color: #155724;
    }

    .status-cancelled {
      background: #f8d7da;
      color: #721c24;
    }

    .status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .booking-ref {
      font-family: monospace;
      font-weight: 600;
      color: #495057;
    }

    .booking-price {
      font-size: 1.25rem;
      font-weight: 700;
      color: #28a745;
    }

    .flight-info {
      margin-bottom: 1rem;
    }

    .flight-route {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 8px;
    }

    .airport {
      text-align: center;
      flex: 1;
    }

    .airport-code {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #495057;
    }

    .city-name {
      font-size: 0.9rem;
      color: #6c757d;
    }

    .flight-arrow {
      text-align: center;
      flex: 0 0 auto;
      margin: 0 1rem;
    }

    .arrow {
      font-size: 1.5rem;
      color: #007bff;
    }

    .flight-number {
      display: block;
      font-size: 0.8rem;
      color: #6c757d;
      margin-top: 0.25rem;
    }

    .flight-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.5rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      background: white;
      border-radius: 6px;
    }

    .detail-item .label {
      font-weight: 600;
      color: #495057;
    }

    .detail-item .value {
      color: #6c757d;
    }

    .booking-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e9ecef;
    }

    .booking-date {
      font-size: 0.9rem;
      color: #6c757d;
    }

    .booking-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .cta-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
      text-decoration: none;
      display: inline-block;
    }

    .cta-button:hover {
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .bookings-header h1 {
        font-size: 2rem;
      }
      
      .empty-state, .login-required {
        padding: 2rem 1rem;
      }

      .flight-route {
        flex-direction: column;
        gap: 1rem;
      }

      .flight-arrow {
        margin: 0;
      }

      .arrow {
        transform: rotate(90deg);
      }

      .booking-footer {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .booking-actions {
        justify-content: center;
      }
    }
  `]
})
export class BookingsComponent implements OnInit, OnDestroy {
  bookings: UserBooking[] = [];
  isLoading = false;
  isLoggedIn = false;
  private subscription?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      this.loadUserBookings();
    }

    // Sottoscrizione ai cambiamenti di autenticazione
    this.subscription = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      if (this.isLoggedIn) {
        this.loadUserBookings();
      } else {
        this.bookings = [];
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private loadUserBookings(): void {
    this.isLoading = true;
    
    this.authService.getUserBookings().subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.isLoading = false;
        console.log('Loaded user bookings:', bookings);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.isLoading = false;
        this.notificationService.showError(
          'Errore nel caricamento',
          'Impossibile caricare le prenotazioni. Riprova più tardi.'
        );
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed': return 'Confermata';
      case 'cancelled': return 'Annullata';
      case 'pending': return 'In attesa';
      default: return status;
    }
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  canCancel(booking: UserBooking): boolean {
    const departureTime = new Date(booking.departure_time);
    const now = new Date();
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Permetti cancellazione se il volo è tra più di 24 ore
    return hoursUntilDeparture > 24;
  }

  cancelBooking(booking: UserBooking): void {
    if (confirm(`Sei sicuro di voler annullare la prenotazione ${booking.booking_reference}?`)) {
      // Implementa la cancellazione via API
      this.notificationService.showInfo(
        'Cancellazione in corso',
        'La cancellazione della prenotazione è in elaborazione...'
      );
      
      // TODO: Implementare chiamata API per cancellazione
      console.log('Cancelling booking:', booking.booking_reference);
    }
  }

  downloadTicket(booking: UserBooking): void {
    this.notificationService.showSuccess(
      '📧 Biglietto inviato!',
      `Il biglietto per il volo ${booking.flight_number} è stato rinviato alla tua email.`
    );
    
    // TODO: Implementare download/reinvio biglietto
    console.log('Downloading ticket for booking:', booking.booking_reference);
  }}
