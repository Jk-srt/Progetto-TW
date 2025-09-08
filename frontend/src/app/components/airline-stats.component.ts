import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';

interface AirlineStatsResponse {
  success: boolean;
  data: {
    airline: { id: number; name: string; code: string };
    flights: Array<{
      flight_number: string;
      departure_time: string;
      arrival_time: string;
      flight_status: string;
      route: {
        departure: { airport_name: string; airport_code: string; city: string };
        arrival: { airport_name: string; airport_code: string; city: string };
      };
      aircraft: { registration: string; type: string; model: string };
      airline: { name: string; code: string };
      bookings: Array<{
        booking_id: number;
        booking_reference: string;
        booking_status: string;
        booking_price: number;
        booking_date: string;
        passenger: { first_name: string; last_name: string; email: string; phone: string };
        seat_number: string;
        booking_class: string;
      }>;
      total_bookings: number;
      total_revenue: number;
      seats_by_class: { economy: number; business: number; first: number };
    }>;
    statistics: {
      total_bookings: number;
      active_bookings: number;
      cancelled_bookings: number;
      total_revenue: number;
      average_booking_value: number;
    };
  };
}

@Component({
  selector: 'app-airline-stats',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="stats-page">
      <div class="header">
        <h1>📊 Statistiche Compagnia</h1>
      </div>

      <div *ngIf="loading" class="loading">Caricamento...</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <div *ngIf="!loading && !error && stats">
        <div class="summary">
          <div class="card"><div class="label">Prenotazioni totali</div><div class="value">{{ stats.data.statistics.total_bookings }}</div></div>
          <div class="card"><div class="label">Attive</div><div class="value">{{ stats.data.statistics.active_bookings }}</div></div>
          <div class="card"><div class="label">Cancellate</div><div class="value">{{ stats.data.statistics.cancelled_bookings }}</div></div>
          <div class="card"><div class="label">Ricavi totali</div><div class="value">€{{ stats.data.statistics.total_revenue | number:'1.2-2' }}</div></div>
          <div class="card"><div class="label">Valore medio</div><div class="value">€{{ stats.data.statistics.average_booking_value | number:'1.2-2' }}</div></div>
        </div>

        <div class="flights">
          <h2>Voli</h2>
          <div class="flight" *ngFor="let f of stats.data.flights">
            <div class="flight-header">
              <div>
                <strong>{{ f.flight_number }}</strong>
                <span class="route">{{ f.route.departure.city }} ({{ f.route.departure.airport_code }}) → {{ f.route.arrival.city }} ({{ f.route.arrival.airport_code }})</span>
              </div>
              <div class="kpi">
                <span>🎟️ {{ f.total_bookings }}</span>
                <span>💶 €{{ f.total_revenue | number:'1.2-2' }}</span>
                <span>🪑 E{{ f.seats_by_class.economy }} B{{ f.seats_by_class.business }} F{{ f.seats_by_class.first }}</span>
              </div>
            </div>
            <div class="bookings" *ngIf="f.bookings?.length">
              <table>
                <thead>
                  <tr>
                    <th>Ref</th><th>Stato</th><th>Prezzo</th><th>Passeggero</th><th>Posto</th><th>Classe</th><th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let b of f.bookings">
                    <td>{{ b.booking_reference }}</td>
                    <td>{{ b.booking_status }}</td>
                    <td>€{{ b.booking_price | number:'1.2-2' }}</td>
                    <td>{{ b.passenger.first_name }} {{ b.passenger.last_name }}</td>
                    <td>{{ b.seat_number }}</td>
                    <td>{{ b.booking_class }}</td>
                    <td>{{ b.booking_date | date:'short' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .back-btn { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; border-radius: 8px; background: #f7fafc; cursor: pointer; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; text-align: center; }
    .card .label { color: #718096; font-size: 0.9rem; }
    .card .value { color: #2d3748; font-weight: 700; font-size: 1.2rem; }
    .flight { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 1rem; overflow: hidden; }
    .flight-header { display: flex; justify-content: space-between; padding: 0.75rem 1rem; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
    .flight-header .route { margin-left: 0.5rem; color: #4a5568; }
    .flight-header .kpi { display: flex; gap: 1rem; color: #4a5568; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.5rem; border-bottom: 1px solid #edf2f7; text-align: left; }
    .loading, .error { padding: 1rem; }
  `]
})
export class AirlineStatsComponent implements OnInit {
  loading = true;
  error = '';
  stats: AirlineStatsResponse | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.role !== 'airline') {
      this.router.navigate(['/']);
      return;
    }
    this.fetchStats();
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  fetchStats() {
    this.loading = true;
    this.error = '';
    this.http.get<AirlineStatsResponse>(`${environment.apiUrl}/bookings/admin/airline-bookings`, { headers: this.authHeaders() })
      .subscribe({
        next: (res) => { this.stats = res; this.loading = false; },
        error: (err) => { this.error = err?.error?.message || 'Errore nel recupero statistiche'; this.loading = false; }
      });
  }

  goBack() { this.router.navigate(['/flight-admin']); }
}
