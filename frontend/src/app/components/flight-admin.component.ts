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
        <!-- Filtro per compagnie aeree: mostra solo i propri voli -->
        <div class="filter-group" *ngIf="!isAdmin">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              [(ngModel)]="showOnlyMyFlights" 
              (change)="applyFilters()">
            <span class="checkmark"></span>
            Solo i miei voli
          </label>
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

              <!-- Campo aereo sempre visibile per tutti gli utenti -->
              <div class="form-group">
                <label for="aircraft_id">Aereo *</label>
                <select id="aircraft_id" formControlName="aircraft_id" (change)="onAircraftChange()">
                  <option value="">Seleziona aereo</option>
                  <option *ngFor="let aircraft of aircrafts" [value]="aircraft.id">
                    {{aircraft.registration}} - {{aircraft.aircraft_type}} {{aircraft.model}} 
                    ({{aircraft.seat_capacity}} posti)
                  </option>
                </select>
                <div *ngIf="flightForm.get('aircraft_id')?.invalid && flightForm.get('aircraft_id')?.touched" 
                     class="error">Campo obbligatorio</div>
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

            <!-- Info sui posti (solo visualizzazione) -->
            <div class="form-row" *ngIf="flightForm.get('aircraft_id')?.value">
              <div class="info-box">
                <div class="info-item">
                  <strong>🪑 Posti Totali:</strong> 
                  <span>{{getSelectedAircraftCapacity()}} posti</span>
                </div>
                <div class="info-item">
                  <strong>✅ Posti Disponibili:</strong> 
                  <span>{{getSelectedAircraftCapacity()}} posti (tutti disponibili per nuovo volo)</span>
                </div>
                <small class="info-note">
                  ℹ️ I posti vengono impostati automaticamente in base all'aereo selezionato
                </small>
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
              
              <!-- Debug button - Remove in production -->
              <button type="button" class="btn btn-debug" (click)="debugForm()" 
                      style="background: orange; color: white; margin-right: 10px;">
                🐛 Debug Form
              </button>
              
              <button type="submit" class="btn btn-save" [disabled]="flightForm.invalid || isLoading">
                {{isLoading ? 'Salvando...' : 'Salva'}}
              </button>
            </div>
            
            <!-- Form status debug -->
            <div class="debug-info" style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 4px;">
              <strong>Form Status:</strong> 
              <span [style.color]="flightForm.valid ? 'green' : 'red'">
                {{flightForm.valid ? '✅ VALID' : '❌ INVALID'}}
              </span>
              <br>
              <strong>Loading:</strong> {{isLoading ? 'YES' : 'NO'}}
              <br>
              <strong>Button Disabled:</strong> {{(flightForm.invalid || isLoading) ? 'YES' : 'NO'}}
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
  flightForm!: FormGroup; // Inizializzato in ngOnInit
  showModal = false;
  isEditing = false;
  editingFlightId: number | null = null;
  isLoading = false;

  // Filtri
  statusFilter = '';
  searchTerm = '';
  showOnlyMyFlights = false; // Per le compagnie aeree: di default mostra tutti i voli, poi l'utente può filtrare

  // Autorizzazione
  canAccess = false;
  currentUser: User | null = null;
  isAdmin = false;
  
  // Variabile globale per airline_id
  
  airlineId: string | null = null;

  constructor(
    private flightAdminService: FlightAdminService,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Non creare il form qui - lo creiamo dopo aver verificato l'accesso
  }

  ngOnInit() {
    // Controlla autorizzazione
    this.checkAccess();
    
    // Crea il form dopo aver verificato l'accesso
    this.flightForm = this.createFlightForm();
    
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
    this.airlineId = localStorage.getItem('airlineId');
    console.log('AirlineId from localStorage:', this.airlineId);
    // Imposta la variabile globale airline_id se l'utente è una compagnia aerea
    if (this.currentUser?.role === 'airline') {
      console.log('Impostato airlineId globale (stringa):', this.airlineId);
      console.log('Valore numerico corrispondente:', this.airlineId);
    } else {
      this.airlineId = null;
    }
    
    // Stampa informazioni dell'utente loggato
    console.log('=== USER ACCESS INFO ===');
    console.log('Current User:', this.currentUser);
    console.log('User Role:', this.currentUser?.role);
    console.log('Is Admin:', this.isAdmin);
    console.log('Airline ID (dal currentUser):', this.currentUser?.airline_id);
    console.log('Global Airline ID (stringa):', this.airlineId);
    console.log('Global Airline ID (numero):', this.airlineId ? parseInt(this.airlineId) : null);
    console.log('Airline Name:', this.currentUser?.airline_name);
    console.log('Can Access:', this.canAccess);
    console.log('========================');
  }

  private createFlightForm(): FormGroup {
    // Per le compagnie aeree, airline_id non è required perché viene impostato automaticamente
    const airlineIdValidators = this.isAdmin ? [Validators.required] : [];
    
    return this.fb.group({
      flight_number: ['', [Validators.required]],
      airline_id: ['', airlineIdValidators],
      aircraft_id: ['', [Validators.required]], // Ora obbligatorio per avere i posti
      departure_airport_id: ['', [Validators.required]],
      arrival_airport_id: ['', [Validators.required]],
      departure_time: ['', [Validators.required]],
      arrival_time: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      // Rimuovi total_seats e available_seats dal form - saranno calcolati automaticamente
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
    const userAirlineId = this.currentUser?.airline_id?.toString() || '1';
    const mockFlights: Flight[] = [
      {
        id: 1,
        flightNumber: "AZ123", // ← Aggiungi questo campo
        airline: "Alitalia",   // ← Aggiungi questo campo
        aircraft: "Boeing 737", // ← Aggiungi questo campo
        origin: "Roma",        // ← Aggiungi questo campo
        destination: "Milano", // ← Aggiungi questo campo
        departureTime: "2025-07-30T10:00:00Z", // ← Aggiungi questo campo
        arrivalTime: "2025-07-30T11:30:00Z",   // ← Aggiungi questo campo
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
        status: "scheduled" as const,
        // Aggiungi i campi mancanti:
        aircraft_id: 1,
        departure_airport_id: 1,
        arrival_airport_id: 2,
        aircraft_model: "Boeing 737"
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

    // Carica gli aerei in base al ruolo dell'utente
    if (this.isAdmin) {
      // Admin può vedere tutti gli aerei
      this.flightAdminService.getAircrafts().subscribe(aircrafts => {
        this.aircrafts = aircrafts;
        console.log('Admin - Caricati tutti gli aerei:', aircrafts);
      });
    } else if (this.airlineId) {
      // Compagnia aerea vede solo i propri aerei
      this.flightAdminService.getAircraftsByAirline(parseInt(this.airlineId)).subscribe({
        next: (aircrafts: Aircraft[]) => {
          this.aircrafts = aircrafts;
          console.log(`Compagnia ${this.airlineId} - Caricati aerei specifici:`, aircrafts);
        },
        error: (error: any) => {
          console.error('Errore nel caricamento degli aerei della compagnia:', error);
          // Fallback: carica tutti gli aerei e filtra lato client
          this.flightAdminService.getAircrafts().subscribe(allAircrafts => {
            this.aircrafts = allAircrafts.filter(aircraft => aircraft.airline_id === parseInt(this.airlineId!));
            console.log('Fallback - Aerei filtrati lato client:', this.aircrafts);
          });
        }
      });
    } else {
      // Utente senza airline_id non dovrebbe essere qui, ma per sicurezza
      this.aircrafts = [];
      console.log('Nessun airline_id trovato - array aerei vuoto');
    }
  }

  applyFilters() {
    this.filteredFlights = this.flights.filter(flight => {
      const matchesStatus = !this.statusFilter || flight.status === this.statusFilter;
      const matchesSearch = !this.searchTerm || 
        (flight.flight_number?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (flight.airline_name?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (flight.departure_airport?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (flight.arrival_airport?.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      // Filtro per compagnie aeree: se la spunta "Solo i miei voli" è attiva, mostra solo i voli della propria compagnia
      let matchesAirline = true;
      if (!this.isAdmin && this.showOnlyMyFlights && this.airlineId) {
        const myAirlineId = parseInt(this.airlineId);
        console.log('Filtraggio voli per airline_id:', myAirlineId);
        console.log('Volo corrente airline_id:', flight.airline_id);
        matchesAirline = flight.airline_id === myAirlineId;
      }
      
      return matchesStatus && matchesSearch && matchesAirline;
    });
  }

  openCreateModal() {
    this.isEditing = false;
    this.editingFlightId = null;
    this.flightForm.reset();
    this.flightForm.patchValue({ status: 'scheduled' });
    
    // Se non è admin, imposta automaticamente la compagnia aerea
    if (!this.isAdmin && this.airlineId) {
      const airlineIdNumber = parseInt(this.airlineId);
      this.flightForm.patchValue({ airline_id: airlineIdNumber });
      console.log('Impostato airline_id nel form:', airlineIdNumber);
      
      // Verifica che il valore sia stato impostato correttamente
      console.log('Valore airline_id nel form dopo patchValue:', this.flightForm.get('airline_id')?.value);
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
    
    const departureTime = flight.departure_time ? 
      new Date(flight.departure_time).toISOString().slice(0, 16) : '';
    const arrivalTime = flight.arrival_time ? 
      new Date(flight.arrival_time).toISOString().slice(0, 16) : '';
    
    this.flightForm.patchValue({
      flight_number: flight.flight_number || '',
      airline_id: flight.airline_id || '',
      aircraft_id: flight.aircraft_id || '',
      departure_airport_id: flight.departure_airport_id || '',
      arrival_airport_id: flight.arrival_airport_id || '',
      departure_time: departureTime,
      arrival_time: arrivalTime,
      price: flight.price || 0,
      status: flight.status || 'scheduled'
      // Non impostare total_seats e available_seats - saranno calcolati automaticamente
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
      const formData = this.flightForm.value;
      
      // Per le compagnie aeree, assicurati che airline_id sia impostato come numero
      if (!this.isAdmin && this.airlineId) {
        const airlineIdNumber = parseInt(this.airlineId);
        if (!formData.airline_id || formData.airline_id !== airlineIdNumber) {
          formData.airline_id = airlineIdNumber;
          console.log('Forzato airline_id nel saveFlight:', airlineIdNumber);
        }
      }
      
      // Calcola automaticamente i posti dall'aereo selezionato
      const aircraftCapacity = this.getSelectedAircraftCapacity();
      if (aircraftCapacity === 0) {
        alert('Errore: Impossibile determinare la capacità dell\'aereo selezionato');
        this.isLoading = false;
        return;
      }

      // Prepara i dati del volo con posti automatici
      const flightData: FlightFormData = {
        ...formData,
        total_seats: aircraftCapacity,
        available_seats: aircraftCapacity // Per un nuovo volo, tutti i posti sono disponibili
      };

      console.log('Saving flight with data:', flightData);

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
    } else {
      console.log('Form non valido, controlla i campi obbligatori');
      // Debug aggiuntivo per airline_id
      console.log('airline_id nel form:', this.flightForm.get('airline_id')?.value);
      console.log('airline_id errors:', this.flightForm.get('airline_id')?.errors);
      
      // Marca tutti i campi come touched per mostrare gli errori
      Object.keys(this.flightForm.controls).forEach(key => {
        this.flightForm.get(key)?.markAsTouched();
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.isEditing = false;
    this.editingFlightId = null;
    this.flightForm.reset();
  }

  onAircraftChange() {
    // Non fare nulla - i posti saranno calcolati automaticamente quando si salva
    // Questo metodo può essere rimosso o usato per aggiornamenti UI
  }

  // Nuovo metodo per ottenere la capacità dell'aereo selezionato
  getSelectedAircraftCapacity(): number {
    const aircraftId = this.flightForm.get('aircraft_id')?.value;
    if (aircraftId) {
      const selectedAircraft = this.aircrafts.find(aircraft => aircraft.id == aircraftId);
      return selectedAircraft?.seat_capacity || 0;
    }
    return 0;
  }

  trackByFlightId(index: number, flight: Flight): number {
    return flight.id;
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) {
      return 'N/A';
    }
    try {
      return new Date(dateString).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data non valida';
    }
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

  // Debug method to check form status
  debugForm() {
    console.log('=== FORM DEBUG ===');
    console.log('Form valid:', this.flightForm.valid);
    console.log('Form invalid:', this.flightForm.invalid);
    console.log('Loading:', this.isLoading);
    console.log('Form values:', this.flightForm.value);
    console.log('Form errors:', this.flightForm.errors);
    
    // Debug specifico per airline_id
    console.log('=== AIRLINE_ID DEBUG ===');
    console.log('Global airlineId (stringa):', this.airlineId);
    console.log('airlineId come numero:', this.airlineId ? parseInt(this.airlineId) : null);
    console.log('airline_id nel form:', this.flightForm.get('airline_id')?.value);
    console.log('airline_id type:', typeof this.flightForm.get('airline_id')?.value);
    console.log('Is Admin:', this.isAdmin);
    console.log('========================');
    
    // Check each control
    Object.keys(this.flightForm.controls).forEach(key => {
      const control = this.flightForm.get(key);
      console.log(`${key}:`, {
        value: control?.value,
        valid: control?.valid,
        invalid: control?.invalid,
        errors: control?.errors,
        touched: control?.touched,
        dirty: control?.dirty
      });
    });
    console.log('=================');
  }

  canManageFlight(flight: Flight): boolean {
    return this.flightAdminService.canManageFlight(flight);
  }

  // Metodo helper per gestire valori undefined
  getFlightProperty(flight: Flight, property: keyof Flight): string {
    const value = flight[property];
    return value ? String(value) : 'N/A';
  }

  // Metodo per calcoli sicuri
  safeCalculatePercentage(available?: number, total?: number): number {
    if (!available || !total || total === 0) return 0;
    return (available / total) * 100;
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
