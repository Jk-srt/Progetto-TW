import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserBooking } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { AirlineBookingsService, AirlineBookingsData, FlightBookings } from '../services/airline-bookings.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bookings-container">
      <div class="bookings-header">
        <h1 *ngIf="!isAirlineAdmin">Le mie prenotazioni</h1>
        <h1 *ngIf="isAirlineAdmin">Gestione Prenotazioni - {{ airlineData?.airline?.name || 'Admin' }}</h1>
        <p *ngIf="!isAirlineAdmin">Gestisci tutte le tue prenotazioni voli</p>
        <p *ngIf="isAirlineAdmin">Visualizza i posti prenotati nella tua compagnia aerea</p>
      </div>
      
      <!-- Tabs per admin -->
      <div *ngIf="isAirlineAdmin" class="admin-tabs">
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'overview'"
          (click)="activeTab = 'overview'">
          📊 Panoramica
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'flights'"
          (click)="activeTab = 'flights'">
          ✈️ Posti Prenotati
        </button>
      </div>
      
      <div class="bookings-content">
        <!-- Loading state -->
        <div *ngIf="isLoading" class="loading-state">
          <div class="loading-spinner" aria-label="Caricamento" role="status"></div>
          <p>Caricamento prenotazioni...</p>
        </div>

        <!-- Error state -->
        <div *ngIf="errorMessage && !isLoading" class="error-state">
          <div class="error-icon">⚠️</div>
          <h2>Errore nel caricamento</h2>
          <p>{{ errorMessage }}</p>
          <button class="cta-button" (click)="loadData()">
            Riprova
          </button>
        </div>

        <!-- ADMIN VIEW - Posti prenotati per compagnia aerea -->
        <div *ngIf="isAirlineAdmin && !isLoading && !errorMessage && airlineData">
          
          <!-- Overview Tab -->
          <div *ngIf="activeTab === 'overview'" class="admin-overview">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <h3>{{ airlineData.statistics.total_bookings }}</h3>
                  <p>Posti Prenotati</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">✈️</div>
                <div class="stat-content">
                  <h3>{{ airlineData.flights.length }}</h3>
                  <p>Voli con Prenotazioni</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-content">
                  <h3>€{{ airlineData.statistics.total_revenue | number:'1.2-2' }}</h3>
                  <p>Ricavi Totali</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                  <h3>{{ airlineData.statistics.active_bookings }}</h3>
                  <p>Prenotazioni Attive</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Flights Tab - Posti prenotati per volo -->
          <div *ngIf="activeTab === 'flights'" class="admin-flights">
            <div *ngFor="let flight of airlineData.flights" class="flight-seats-card">
              <div class="flight-header">
                <div class="flight-info">
                  <h3>{{ flight.flight_number }}</h3>
                  <div class="route">
                    {{ flight.route.departure.city }} ({{ flight.route.departure.airport_code }}) 
                    → 
                    {{ flight.route.arrival.city }} ({{ flight.route.arrival.airport_code }})
                  </div>
                  <div class="flight-time">{{ formatDateTime(flight.departure_time) }}</div>
                </div>
                <div class="occupancy-stats">
                  <div class="total-seats">{{ flight.total_bookings }} posti prenotati</div>
                  <div class="revenue">€{{ flight.total_revenue | number:'1.2-2' }}</div>
                </div>
              </div>

              <!-- Seat Map Visualization -->
              <div class="seat-map-container">
                <h4>Mappa Posti Prenotati</h4>
                <div class="seat-grid">
                  <div *ngFor="let booking of flight.bookings" 
                       class="occupied-seat" 
                       [class]="'seat-' + booking.booking_class"
                       [title]="booking.passenger.first_name + ' ' + booking.passenger.last_name + ' - ' + booking.seat_number">
                    <div class="seat-number">{{ booking.seat_number }}</div>
                    <div class="passenger-name">{{ booking.passenger.first_name }} {{ booking.passenger.last_name }}</div>
                    <div class="seat-class">{{ getClassLabel(booking.booking_class) }}</div>
                  </div>
                </div>
              </div>

              <!-- Class Distribution -->
              <div class="class-distribution">
                <h4>Distribuzione per Classe</h4>
                <div class="class-stats">
                  <div class="class-stat" *ngIf="flight.seats_by_class.first > 0">
                    <span class="class-label first">First Class</span>
                    <span class="class-count">{{ flight.seats_by_class.first }} posti</span>
                  </div>
                  <div class="class-stat" *ngIf="flight.seats_by_class.business > 0">
                    <span class="class-label business">Business</span>
                    <span class="class-count">{{ flight.seats_by_class.business }} posti</span>
                  </div>
                  <div class="class-stat" *ngIf="flight.seats_by_class.economy > 0">
                    <span class="class-label economy">Economy</span>
                    <span class="class-count">{{ flight.seats_by_class.economy }} posti</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- USER VIEW - Prenotazioni personali (esistente) -->
        <div *ngIf="!isAirlineAdmin">
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
                <div class="booking-price">€{{ getDisplayPrice(booking) | number:'1.2-2' }}</div>
              </div>

              <!-- Flight name prominently displayed -->
              <div class="flight-name-header" *ngIf="booking.flight_name">
                <h3>{{ booking.flight_name }}</h3>
                <p class="route-name">{{ booking.flight_route_name }}</p>
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
                    <span class="value">{{ booking.seat_number }} ({{ getClassLabel(booking.seat_class) }})</span>
                  </div>

                  <!-- Extras acquistati -->
                  <div class="detail-item" *ngIf="booking.extras && booking.extras.length">
                    <span class="label">Extra:</span>
                    <span class="value">
                      <ng-container *ngFor="let ex of booking.extras; let i = index">
                        {{ mapExtraLabel(ex) }}<span *ngIf="ex.quantity && ex.quantity > 1"> ×{{ ex.quantity }}</span>
                        <span class="extra-price">(+€{{ ex.total_price | number:'1.2-2' }})</span>
                        <span *ngIf="i < booking.extras.length - 1">, </span>
                      </ng-container>
                    </span>
                  </div>
                  
                  <!-- Informazioni cliente aggiuntive per compagnie aeree -->
                  <div *ngIf="isAirlineAdmin && booking.customer_phone" class="detail-item customer-info">
                    <span class="label">Contatto:</span>
                    <span class="value">{{ booking.customer_phone }}</span>
                  </div>
                </div>
              </div>

              <div class="booking-footer">
                <span class="booking-date">Prenotato il {{ formatDate(booking.created_at) }}</span>
                <div class="booking-actions" *ngIf="!isAirlineAdmin">
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
                <!-- Azioni admin per compagnie aeree -->
                <div class="admin-actions" *ngIf="isAirlineAdmin">
                  <span class="admin-note">👥 Cliente: {{ booking.customer_first_name }} {{ booking.customer_last_name }}</span>
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

    /* Spinner rotondo animato */
    .loading-spinner {
      width: 48px;
      height: 48px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      border: 4px solid rgba(102, 126, 234, 0.2); /* #667eea tenue */
      border-top-color: #667eea;
      animation: bookings-spin 1s linear infinite;
    }

    @keyframes bookings-spin {
      to { transform: rotate(360deg); }
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

    /* Admin Tabs */
    .admin-tabs {
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;
      gap: 1rem;
    }

    .tab-button {
      padding: 0.8rem 1.5rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border-radius: 25px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .tab-button:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .tab-button.active {
      background: white;
      color: #2c3e50;
      border-color: white;
    }

    /* Admin Overview */
    .admin-overview .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
      padding: 1rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      padding: 2rem 1.5rem;
      border-radius: 16px;
      color: white;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .stat-card:nth-child(1) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card:nth-child(2) {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .stat-card:nth-child(3) {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .stat-card:nth-child(4) {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.1);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .stat-card:hover::before {
      opacity: 1;
    }

    .stat-icon {
      font-size: 3.5rem;
      margin-right: 1.5rem;
      opacity: 0.9;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }

    .stat-content h3 {
      font-size: 2.5rem;
      margin: 0;
      font-weight: 800;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stat-content p {
      margin: 0.8rem 0 0 0;
      opacity: 0.95;
      font-size: 1.1rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Flight Seats Cards */
    .admin-flights {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
      padding: 1rem;
    }

    .flight-seats-card {
      border: none;
      border-radius: 20px;
      overflow: hidden;
      background: white;
      box-shadow: 0 15px 40px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }

    .flight-seats-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
    }

    .flight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      position: relative;
      overflow: hidden;
    }

    .flight-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: shine 3s ease-in-out infinite;
    }

    @keyframes shine {
      0%, 100% { opacity: 0; }
      50% { opacity: 1; }
    }

    .flight-info h3 {
      margin: 0 0 0.8rem 0;
      font-size: 1.8rem;
      font-weight: 800;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .route {
      font-size: 1.1rem;
      opacity: 0.95;
      margin-bottom: 0.8rem;
      font-weight: 500;
    }

    .flight-time {
      font-size: 1rem;
      opacity: 0.9;
      font-weight: 400;
    }

    .occupancy-stats {
      text-align: right;
      z-index: 1;
      position: relative;
    }

    .total-seats {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .revenue {
      font-size: 1.2rem;
      opacity: 0.95;
      font-weight: 500;
    }

    /* Seat Map */
    .seat-map-container {
      padding: 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-bottom: 1px solid #dee2e6;
    }

    .seat-map-container h4 {
      margin-bottom: 1.5rem;
      color: #2c3e50;
      font-size: 1.3rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .seat-map-container h4::before {
      content: '🪑';
      font-size: 1.2rem;
    }

    .seat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
      max-height: 350px;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .occupied-seat {
      display: flex;
      flex-direction: column;
      padding: 1.2rem;
      border-radius: 12px;
      border-left: 5px solid;
      background: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
    }

    .occupied-seat:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.12);
    }

    .occupied-seat.seat-first {
      border-left-color: #9b59b6;
      background: linear-gradient(135deg, #f8f4ff 0%, #e8d5ff 100%);
    }

    .occupied-seat.seat-business {
      border-left-color: #f39c12;
      background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
    }

    .occupied-seat.seat-economy {
      border-left-color: #27ae60;
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
    }

    .seat-number {
      font-weight: 800;
      font-size: 1.2rem;
      color: #2c3e50;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .seat-number::before {
      content: '💺';
      font-size: 1rem;
    }

    .passenger-name {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.3rem;
      font-size: 1rem;
    }

    .seat-class {
      font-size: 0.85rem;
      font-weight: 600;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Class Distribution */
    .class-distribution {
      padding: 2rem;
      background: #f8f9fa;
    }

    .class-distribution h4 {
      margin-bottom: 1.5rem;
      color: #2c3e50;
      font-size: 1.3rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .class-distribution h4::before {
      content: '📊';
      font-size: 1.2rem;
    }

    .class-stats {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      justify-content: space-around;
    }

    .class-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem;
      border-radius: 16px;
      min-width: 140px;
      background: white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
    }

    .class-stat:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.12);
    }

    .class-label {
      font-weight: 700;
      margin-bottom: 0.8rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      color: white;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .class-label.first {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .class-label.business {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .class-label.economy {
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
    }

    .class-count {
      font-size: 1.4rem;
      font-weight: 800;
      color: #2c3e50;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    /* Error State */
    .error-state {
      text-align: center;
      padding: 3rem;
      color: #e74c3c;
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    @media (max-width: 768px) {
      .bookings-header h1 {
        font-size: 2rem;
      }
      
      .admin-tabs {
        flex-direction: column;
        align-items: center;
      }

      .admin-overview .stats-grid {
        grid-template-columns: 1fr;
      }

      .flight-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .seat-grid {
        grid-template-columns: 1fr;
      }

      .class-stats {
        justify-content: center;
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

    /* Flight Name Header */
    .flight-name-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem;
      margin: -1rem -1rem 1rem -1rem;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }

    .flight-name-header h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .route-name {
      margin: 0;
      font-size: 1rem;
      opacity: 0.9;
    }

    /* Customer Info for Airlines */
    .customer-info {
      border-left: 4px solid #28a745;
      background: linear-gradient(135deg, #d4edda 0%, #e8f5e9 100%);
    }

    .customer-info .label {
      color: #155724;
    }

    .customer-info .value {
      color: #155724;
      font-weight: 600;
    }

    /* Admin Actions */
    .admin-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .admin-note {
      font-size: 0.9rem;
      color: #495057;
      font-weight: 500;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
      border-radius: 15px;
      border-left: 3px solid #2196f3;
    }

    /* Enhanced booking cards for airlines */
    .booking-card:not(.cancelled) {
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border-left: 4px solid transparent;
    }

    .booking-card:not(.cancelled):hover {
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    /* Status-specific colors for airline view */
    .status-confirmed {
      background: linear-gradient(135deg, #28a745 0%, #34ce57 100%);
    }

    .status-pending {
      background: linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%);
      color: #212529;
    }

    .status-cancelled {
      background: linear-gradient(135deg, #dc3545 0%, #e57373 100%);
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
      .bookings-container {
        padding: 0 0.5rem;
        margin: 1rem auto;
      }
      
      .bookings-header h1 {
        font-size: 2rem;
      }
      
      .admin-tabs {
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .tab-button {
        padding: 1rem;
        text-align: center;
      }
      
      .admin-overview .stats-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
        padding: 0.5rem;
      }
      
      .stat-card {
        padding: 1.5rem 1rem;
      }
      
      .stat-icon {
        font-size: 2.5rem;
        margin-right: 1rem;
      }
      
      .stat-content h3 {
        font-size: 2rem;
      }
      
      .flight-header {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }
      
      .occupancy-stats {
        text-align: center;
      }
      
      .seat-grid {
        grid-template-columns: 1fr;
        max-height: 250px;
      }
      
      .class-stats {
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }
      
      .class-stat {
        min-width: 200px;
      }
    }
    
    @media (max-width: 480px) {
      .bookings-header h1 {
        font-size: 1.5rem;
      }
      
      .stat-content h3 {
        font-size: 1.5rem;
      }
      
      .flight-info h3 {
        font-size: 1.4rem;
      }
      
      .route {
        font-size: 1rem;
      }
    }
  `]
})
export class BookingsComponent implements OnInit, OnDestroy {
  // User bookings (esistente)
  bookings: UserBooking[] = [];
  
  // Admin data (nuovo)
  airlineData: AirlineBookingsData | null = null;
  activeTab: 'overview' | 'flights' = 'overview';
  
  // Component state
  isLoading = false;
  isLoggedIn = false;
  isAirlineAdmin = false;
  errorMessage: string | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private airlineBookingsService: AirlineBookingsService
  ) {}

  ngOnInit(): void {
    console.log('📋 BookingsComponent: Initializing...');
    
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      this.checkUserRole();
      this.loadData();
    }

    // Sottoscrizione ai cambiamenti di autenticazione
    const authSub = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      if (this.isLoggedIn) {
        this.checkUserRole();
        this.loadData();
      } else {
        this.resetData();
      }
    });
    this.subscriptions.push(authSub);

    // Sottoscrizioni per admin
    if (this.isAirlineAdmin) {
      const airlineDataSub = this.airlineBookingsService.bookingsData$.subscribe(data => {
        this.airlineData = data;
      });
      this.subscriptions.push(airlineDataSub);

      const loadingSub = this.airlineBookingsService.loading$.subscribe(loading => {
        this.isLoading = loading;
      });
      this.subscriptions.push(loadingSub);

      const errorSub = this.airlineBookingsService.error$.subscribe(error => {
        this.errorMessage = error;
      });
      this.subscriptions.push(errorSub);
    }
  }

  ngOnDestroy(): void {
    console.log('📋 BookingsComponent: Destroying...');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.isAirlineAdmin) {
      this.airlineBookingsService.reset();
    }
  }

  private checkUserRole(): void {
    const currentUser = this.authService.getCurrentUser();
    this.isAirlineAdmin = currentUser?.role === 'airline';
    console.log('👤 User role check:', { isAirlineAdmin: this.isAirlineAdmin, role: currentUser?.role });
  }

  loadData(): void {
    if (this.isAirlineAdmin) {
      this.loadAirlineBookings();
    } else {
      this.loadUserBookings();
    }
  }

  private loadUserBookings(): void {
    console.log('📥 Loading user bookings...');
    console.log('🔍 Current user:', this.authService.getCurrentUser());
    console.log('🔑 Is logged in:', this.authService.isLoggedIn());
    console.log('🎯 Auth token exists:', !!this.authService.getToken());
    
    this.isLoading = true;
    this.errorMessage = null;
    
    this.authService.getUserBookings().subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.isLoading = false;
        console.log('✅ Loaded user bookings:', bookings);
        console.log('📊 Number of bookings:', bookings.length);
      },
      error: (error) => {
        console.error('❌ Error loading user bookings:', error);
        console.error('❌ Error details:', error.error);
        console.error('❌ Status:', error.status);
        this.isLoading = false;
        this.errorMessage = 'Errore nel caricamento delle prenotazioni';
        this.notificationService.showError(
          'Errore nel caricamento', 
          'Impossibile caricare le prenotazioni. Riprova più tardi.'
        );
      }
    });
  }

  private loadAirlineBookings(): void {
    console.log('📥 Loading airline bookings...');
    this.airlineBookingsService.loadAirlineBookings().subscribe({
      next: (data) => {
        console.log('✅ Airline bookings loaded successfully');
      },
      error: (error) => {
        console.error('❌ Error loading airline bookings:', error);
      }
    });
  }

  private resetData(): void {
    this.bookings = [];
    this.airlineData = null;
    this.isAirlineAdmin = false;
    this.errorMessage = null;
  }

  // Utility methods
  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'confirmed': 'Confermata',
      'cancelled': 'Annullata',
      'pending': 'In attesa',
      'completed': 'Completata'
    };
    return statusLabels[status] || status;
  }

  getClassLabel(seatClass: string): string {
    const classLabels: { [key: string]: string } = {
      'economy': 'Economy',
      'business': 'Business',
      'first': 'First Class'
    };
    return classLabels[seatClass] || seatClass;
  }

  mapExtraLabel(ex: any): string {
    const labels: Record<string, string> = {
      baggage: 'Bagaglio aggiuntivo',
      extra_legroom: 'Spazio extra gambe',
      preferred_seat: 'Posto preferito',
      priority_boarding: 'Imbarco prioritario',
      premium_meal: 'Pasto premium'
    };
    if (ex.type === 'baggage' && ex.details?.type) {
      const typeMap: Record<string, string> = {
        light15: '15kg',
        standard23: '23kg',
        heavy32: '32kg'
      };
      const weight = typeMap[ex.details.type] || ex.details.type;
      return `${labels[ex.type] || ex.type} (${weight})`;
    }
    return labels[ex.type] || ex.type;
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  }

  getDisplayPrice(booking: UserBooking): number {
    const extrasTotal = (booking.extras || []).reduce((sum, extra) => sum + extra.total_price, 0);
    // Ensure total_price is a number before adding
    const basePrice = typeof booking.total_price === 'number' ? booking.total_price : 0;
    return basePrice + extrasTotal;
  }

  // User booking actions (esistenti)
  canCancel(booking: UserBooking): boolean {
    const departureTime = new Date(booking.departure_time);
    const now = new Date();
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDeparture > 24;
  }

  cancelBooking(booking: UserBooking): void {
    if (confirm(`Sei sicuro di voler annullare la prenotazione ${booking.booking_reference}? Questa azione è irreversibile.`)) {
      this.notificationService.showInfo(
        'Cancellazione in corso',
        `Annullamento della prenotazione ${booking.booking_reference}...`
      );
      console.log(`[ACTION] Initiating cancellation for booking ID: ${booking.booking_id}`);

      this.authService.cancelBooking(booking.booking_id).subscribe({
        next: (response) => {
          console.log('[SUCCESS] Cancellation response:', response);
          this.notificationService.showSuccess(
            'Prenotazione Annullata',
            response.message || `La prenotazione ${booking.booking_reference} è stata cancellata con successo.`
          );
          // Ricarica i dati per aggiornare la vista
          this.loadData();
        },
        error: (error) => {
          console.error('[ERROR] Cancellation failed:', error);
          const errorMessage = error.error?.message || 'Si è verificato un errore durante la cancellazione.';
          this.notificationService.showError(
            'Cancellazione Fallita',
            errorMessage
          );
        }
      });
    }
  }

  downloadTicket(booking: UserBooking): void {
    this.notificationService.showSuccess(
      '📧 Biglietto inviato!',
      `Il biglietto per il volo ${booking.flight_number} è stato rinviato alla tua email.`
    );
    console.log('Downloading ticket for booking:', booking.booking_reference);
  }
}
