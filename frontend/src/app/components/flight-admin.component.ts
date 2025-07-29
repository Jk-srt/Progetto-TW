import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FlightAdminService } from '../services/flight-admin.service';
import { Flight, Airport, Airline, Aircraft, FlightFormData } from '../models/flight.model';
import { User } from '../models/user.model';

@Component({
  selector: 'app-flight-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <!-- Controllo accesso -->
    <div *ngIf="!canAccess" class="access-denied">
      <div class="access-denied-content">
        <h1>🚫 Accesso Negato</h1>
        <p>Solo le compagnie aeree registrate possono accedere a questa sezione.</p>
        <div class="demo-login-buttons">
          <button class="btn btn-primary" (click)="simulateAirlineLogin()">
            🛫 Accedi come Alitalia (Demo)
          </button>
          <button class="btn btn-secondary" (click)="goToHome()">
            🏠 Torna alla Home
          </button>
        </div>
      </div>
    </div>

    <div *ngIf="canAccess" class="flight-admin-container">
      <!-- Header -->
      <div class="admin-header">
        <div class="header-info">
          <h1>🛫 Gestione Voli</h1>
          <div class="user-info" *ngIf="currentUser">
            <span class="airline-badge">{{currentUser.airline_name || currentUser.first_name}}</span>
            <span class="role-badge">{{getRoleLabel(currentUser.role)}}</span>
          </div>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
          ➕ Nuovo Volo
        </button>
      </div>

      <!-- Filtri -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Stato:</label>
          <select [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option value="">Tutti</option>
            <option value="scheduled">Programmato</option>
            <option value="delayed">Ritardato</option>
            <option value="cancelled">Cancellato</option>
            <option value="completed">Completato</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Ricerca:</label>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="applyFilters()"
            placeholder="Numero volo, aeroporto...">
        </div>
      </div>

      <!-- Tabella voli -->
      <div class="flights-table-container">
        <table class="flights-table">
          <thead>
            <tr>
              <th>Numero Volo</th>
              <th>Compagnia</th>
              <th>Rotta</th>
              <th>Partenza</th>
              <th>Arrivo</th>
              <th>Prezzo</th>
              <th>Posti</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let flight of filteredFlights; trackBy: trackByFlightId">
              <td class="flight-number">{{flight.flight_number}}</td>
              <td>{{flight.airline_name || 'N/A'}}</td>
              <td class="route">
                <div class="route-info">
                  <span class="airport">{{flight.departure_code}} {{flight.departure_city}}</span>
                  <span class="arrow">→</span>
                  <span class="airport">{{flight.arrival_code}} {{flight.arrival_city}}</span>
                </div>
              </td>
              <td>{{formatDateTime(flight.departure_time)}}</td>
              <td>{{formatDateTime(flight.arrival_time)}}</td>
              <td class="price">€{{flight.price}}</td>
              <td class="seats">
                <span class="available">{{flight.available_seats}}</span>
                /
                <span class="total">{{flight.total_seats}}</span>
              </td>
              <td>
                <span class="status" [class]="'status-' + flight.status">
                  {{getStatusLabel(flight.status)}}
                </span>
              </td>
              <td class="actions">
                <button 
                  *ngIf="canManageFlight(flight)"
                  class="btn btn-sm btn-edit" 
                  (click)="editFlight(flight)">
                  ✏️
                </button>
                <button 
                  *ngIf="canManageFlight(flight)"
                  class="btn btn-sm btn-delete" 
                  (click)="deleteFlight(flight)">
                  🗑️
                </button>
                <span *ngIf="!canManageFlight(flight)" class="no-permission">
                  🔒
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="filteredFlights.length === 0" class="no-flights">
          <p>Nessun volo trovato</p>
        </div>
      </div>

      <!-- Modal per creazione/modifica volo -->
      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{isEditing ? 'Modifica Volo' : 'Nuovo Volo'}}</h2>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <form [formGroup]="flightForm" (ngSubmit)="saveFlight()" class="flight-form">
            <div class="form-row">
              <div class="form-group">
                <label for="flight_number">Numero Volo *</label>
                <input 
                  id="flight_number"
                  type="text" 
                  formControlName="flight_number"
                  placeholder="es. AZ123">
                <div *ngIf="flightForm.get('flight_number')?.invalid && flightForm.get('flight_number')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>

              <!-- Mostra dropdown compagnia solo per admin -->
              <div class="form-group" *ngIf="isAdmin">
                <label for="airline_id">Compagnia Aerea *</label>
                <select id="airline_id" formControlName="airline_id">
                  <option value="">Seleziona compagnia</option>
                  <option *ngFor="let airline of airlines" [value]="airline.id">
                    {{airline.name}} ({{airline.iata_code}})
                  </option>
                </select>
                <div *ngIf="flightForm.get('airline_id')?.invalid && flightForm.get('airline_id')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>

              <!-- Per le compagnie aeree, mostra solo il nome della propria compagnia -->
              <div class="form-group" *ngIf="!isAdmin && currentUser?.airline_name">
                <label>Compagnia Aerea</label>
                <input type="text" [value]="currentUser?.airline_name || ''" readonly class="readonly-field">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="departure_airport_id">Aeroporto Partenza *</label>
                <select id="departure_airport_id" formControlName="departure_airport_id">
                  <option value="">Seleziona aeroporto</option>
                  <option *ngFor="let airport of airports" [value]="airport.id">
                    {{airport.name}} ({{airport.iata_code}}) - {{airport.city}}
                  </option>
                </select>
                <div *ngIf="flightForm.get('departure_airport_id')?.invalid && flightForm.get('departure_airport_id')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>

              <div class="form-group">
                <label for="arrival_airport_id">Aeroporto Arrivo *</label>
                <select id="arrival_airport_id" formControlName="arrival_airport_id">
                  <option value="">Seleziona aeroporto</option>
                  <option *ngFor="let airport of airports" [value]="airport.id">
                    {{airport.name}} ({{airport.iata_code}}) - {{airport.city}}
                  </option>
                </select>
                <div *ngIf="flightForm.get('arrival_airport_id')?.invalid && flightForm.get('arrival_airport_id')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="departure_time">Data/Ora Partenza *</label>
                <input 
                  id="departure_time"
                  type="datetime-local" 
                  formControlName="departure_time">
                <div *ngIf="flightForm.get('departure_time')?.invalid && flightForm.get('departure_time')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>

              <div class="form-group">
                <label for="arrival_time">Data/Ora Arrivo *</label>
                <input 
                  id="arrival_time"
                  type="datetime-local" 
                  formControlName="arrival_time">
                <div *ngIf="flightForm.get('arrival_time')?.invalid && flightForm.get('arrival_time')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="aircraft_id">Aereo</label>
                <select id="aircraft_id" formControlName="aircraft_id">
                  <option value="">Seleziona aereo</option>
                  <option *ngFor="let aircraft of aircrafts" [value]="aircraft.id">
                    {{aircraft.registration}} - {{aircraft.aircraft_type}} {{aircraft.model}}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="price">Prezzo (€) *</label>
                <input 
                  id="price"
                  type="number" 
                  formControlName="price"
                  min="0"
                  step="0.01">
                <div *ngIf="flightForm.get('price')?.invalid && flightForm.get('price')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="total_seats">Posti Totali *</label>
                <input 
                  id="total_seats"
                  type="number" 
                  formControlName="total_seats"
                  min="1"
                  (input)="onTotalSeatsChange()">
                <div *ngIf="flightForm.get('total_seats')?.invalid && flightForm.get('total_seats')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>

              <div class="form-group">
                <label for="available_seats">Posti Disponibili *</label>
                <input 
                  id="available_seats"
                  type="number" 
                  formControlName="available_seats"
                  min="0">
                <div *ngIf="flightForm.get('available_seats')?.invalid && flightForm.get('available_seats')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="status">Stato *</label>
                <select id="status" formControlName="status">
                  <option value="scheduled">Programmato</option>
                  <option value="delayed">Ritardato</option>
                  <option value="cancelled">Cancellato</option>
                  <option value="completed">Completato</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-cancel" (click)="closeModal()">
                Annulla
              </button>
              <button type="submit" class="btn btn-save" [disabled]="flightForm.invalid || isLoading">
                {{isLoading ? 'Salvando...' : 'Salva'}}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Loading overlay -->
      <div *ngIf="isLoading" class="loading-overlay">
        <div class="spinner"></div>
      </div>
    </div>
  `,
  styleUrl: './flight-admin.component.scss'
})
export class FlightAdminComponent implements OnInit {
  flights: Flight[] = [];
  filteredFlights: Flight[] = [];
  airports: Airport[] = [];
  airlines: Airline[] = [];
  aircrafts: Aircraft[] = [];

  // Form e modal
  flightForm: FormGroup;
  showModal = false;
  isEditing = false;
  editingFlightId: number | null = null;
  isLoading = false;

  // Filtri
  statusFilter = '';
  searchTerm = '';

  // Autorizzazione
  canAccess = false;
  currentUser: User | null = null;
  isAdmin = false;

  constructor(
    private flightAdminService: FlightAdminService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.flightForm = this.createFlightForm();
  }

  ngOnInit() {
    // Controlla autorizzazione
    this.checkAccess();
    
    if (this.canAccess) {
      this.loadFlights();
      this.loadSupportData();
    }
  }

  private checkAccess(): void {
    const userStr = localStorage.getItem('user');
    this.currentUser = userStr ? JSON.parse(userStr) : null;
    this.isAdmin = this.currentUser?.role === 'admin';
    this.canAccess = this.flightAdminService.canAccessFlightManagement();
  }

  private createFlightForm(): FormGroup {
    return this.fb.group({
      flight_number: ['', [Validators.required]],
      airline_id: ['', [Validators.required]],
      aircraft_id: [''],
      departure_airport_id: ['', [Validators.required]],
      arrival_airport_id: ['', [Validators.required]],
      departure_time: ['', [Validators.required]],
      arrival_time: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      total_seats: ['', [Validators.required, Validators.min(1)]],
      available_seats: ['', [Validators.required, Validators.min(0)]],
      status: ['scheduled', [Validators.required]]
    });
  }

  loadFlights() {
    this.isLoading = true;
    this.flightAdminService.getFlights().subscribe({
      next: (flights) => {
        this.flights = flights;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento dei voli:', error);
        this.isLoading = false;
        // Per ora mostra voli mock se l'API fallisce
        this.loadMockFlights();
      }
    });
  }

  private loadMockFlights() {
    // Filtra i voli mock per la compagnia corrente
    const userAirlineId = this.currentUser?.airline_id?.toString() || '1';
    const mockFlights = [
      {
        id: 1,
        flight_number: "AZ123",
        airline_id: 1,
        airline_name: "Alitalia",
        departure_airport: "Leonardo da Vinci International Airport",
        departure_code: "FCO",
        departure_city: "Roma",
        arrival_airport: "Milano Malpensa",
        arrival_code: "MXP",
        arrival_city: "Milano",
        departure_time: "2025-07-30T10:00:00Z",
        arrival_time: "2025-07-30T11:30:00Z",
        price: 150.50,
        total_seats: 180,
        available_seats: 120,
        status: "scheduled" as const
      }
    ];

    if (this.isAdmin) {
      this.flights = mockFlights;
    } else {
      this.flights = mockFlights.filter(f => f.airline_id === parseInt(userAirlineId || '0'));
    }
    
    this.applyFilters();
  }

  loadSupportData() {
    this.flightAdminService.getAirports().subscribe(airports => {
      this.airports = airports;
    });

    this.flightAdminService.getAirlines().subscribe(airlines => {
      this.airlines = airlines;
    });

    this.flightAdminService.getAircrafts().subscribe(aircrafts => {
      this.aircrafts = aircrafts;
    });
  }

  applyFilters() {
    this.filteredFlights = this.flights.filter(flight => {
      const matchesStatus = !this.statusFilter || flight.status === this.statusFilter;
      const matchesSearch = !this.searchTerm || 
        flight.flight_number.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        flight.airline_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        flight.departure_airport.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        flight.arrival_airport.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }

  openCreateModal() {
    this.isEditing = false;
    this.editingFlightId = null;
    this.flightForm.reset();
    this.flightForm.patchValue({ status: 'scheduled' });
    
    // Se non è admin, imposta automaticamente la compagnia aerea
    if (!this.isAdmin && this.currentUser?.airline_id) {
      this.flightForm.patchValue({ airline_id: this.currentUser.airline_id });
    }
    
    this.showModal = true;
  }

  editFlight(flight: Flight) {
    if (!this.canManageFlight(flight)) {
      alert('Non hai i permessi per modificare questo volo');
      return;
    }

    this.isEditing = true;
    this.editingFlightId = flight.id;
    
    // Formato delle date per datetime-local
    const departureTime = new Date(flight.departure_time).toISOString().slice(0, 16);
    const arrivalTime = new Date(flight.arrival_time).toISOString().slice(0, 16);
    
    this.flightForm.patchValue({
      flight_number: flight.flight_number,
      airline_id: flight.airline_id,
      aircraft_id: flight.aircraft_id,
      departure_airport_id: flight.departure_airport_id,
      arrival_airport_id: flight.arrival_airport_id,
      departure_time: departureTime,
      arrival_time: arrivalTime,
      price: flight.price,
      total_seats: flight.total_seats,
      available_seats: flight.available_seats,
      status: flight.status
    });
    
    this.showModal = true;
  }

  deleteFlight(flight: Flight) {
    if (!this.canManageFlight(flight)) {
      alert('Non hai i permessi per eliminare questo volo');
      return;
    }

    if (confirm(`Sei sicuro di voler eliminare il volo ${flight.flight_number}?`)) {
      this.isLoading = true;
      this.flightAdminService.deleteFlight(flight.id).subscribe({
        next: () => {
          this.loadFlights();
          alert('Volo eliminato con successo');
        },
        error: (error) => {
          console.error('Errore nell\'eliminazione:', error);
          alert('Errore nell\'eliminazione del volo: ' + (error.error?.error || 'Errore sconosciuto'));
          this.isLoading = false;
        }
      });
    }
  }

  saveFlight() {
    if (this.flightForm.valid) {
      this.isLoading = true;
      const flightData: FlightFormData = this.flightForm.value;

      const operation = this.isEditing 
        ? this.flightAdminService.updateFlight(this.editingFlightId!, flightData)
        : this.flightAdminService.createFlight(flightData);

      operation.subscribe({
        next: () => {
          this.closeModal();
          this.loadFlights();
          alert(`Volo ${this.isEditing ? 'aggiornato' : 'creato'} con successo`);
        },
        error: (error) => {
          console.error('Errore nel salvataggio:', error);
          alert('Errore nel salvataggio: ' + (error.error?.error || 'Errore sconosciuto'));
          this.isLoading = false;
        }
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.isEditing = false;
    this.editingFlightId = null;
    this.flightForm.reset();
  }

  onTotalSeatsChange() {
    const totalSeats = this.flightForm.get('total_seats')?.value;
    if (totalSeats && !this.isEditing) {
      this.flightForm.patchValue({ available_seats: totalSeats });
    }
  }

  trackByFlightId(index: number, flight: Flight): number {
    return flight.id;
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'scheduled': 'Programmato',
      'delayed': 'Ritardato',
      'cancelled': 'Cancellato',
      'completed': 'Completato'
    };
    return labels[status] || status;
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'airline': 'Compagnia Aerea',
      'admin': 'Amministratore',
      'user': 'Utente'
    };
    return labels[role] || role;
  }

  canManageFlight(flight: Flight): boolean {
    return this.flightAdminService.canManageFlight(flight);
  }

  // Metodi per demo
  simulateAirlineLogin() {
    // Redirect to airline login page
    this.router.navigate(['/airline-login']);
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
