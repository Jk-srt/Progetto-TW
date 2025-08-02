import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FlightAdminService } from '../services/flight-admin.service';
import { RouteAdminService } from '../services/route-admin.service';
import { Flight, Airport, Airline, Aircraft, FlightFormData } from '../models/flight.model';
import { Route } from '../models/route.model';
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
        <div class="filter-group" *ngIf="!isAdmin && currentUser?.airline_name">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              [(ngModel)]="showOnlyMyFlights" 
              (change)="applyFilters()">
            <span class="checkmark"></span>
            Solo voli {{currentUser?.airline_name}}
          </label>
          <small class="filter-info">
            {{showOnlyMyFlights ? 'Mostrando solo i tuoi voli' : 'Mostrando tutti i voli'}}
            ({{filteredFlights.length}} voli visualizzati)
          </small>
        </div>
        <!-- Info per admin -->
        <div class="filter-group admin-info" *ngIf="isAdmin">
          <small class="filter-info">
            👑 Modalità Amministratore - Visualizzando tutti i voli di tutte le compagnie
            ({{filteredFlights.length}} voli totali)
          </small>
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
              <th>Sovrapprezzo</th>
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
              <td class="price">
                €{{flight.price}}
              </td>
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
                <!-- Pulsanti di gestione solo per voli della propria compagnia -->
                <div *ngIf="canManageFlight(flight)" class="action-buttons">
                  <!-- Prima riga: Modifica e Ritardo -->
                  <div class="button-row">
                    <button 
                      class="btn btn-sm btn-edit" 
                      (click)="editFlight(flight)"
                      title="Modifica volo">
                      ✏️
                    </button>
                    <button 
                      class="btn btn-sm btn-delay" 
                      (click)="addDelay(flight)"
                      title="Aggiungi ritardo"
                      *ngIf="flight.status === 'scheduled' || flight.status === 'delayed'">
                      ⏰
                    </button>
                  </div>
                  <!-- Seconda riga: Completa e Cancella -->
                  <div class="button-row">
                    <button 
                      class="btn btn-sm btn-complete" 
                      (click)="completeFlight(flight)"
                      title="Completa volo"
                      *ngIf="flight.status === 'scheduled' || flight.status === 'delayed'">
                      ✅
                    </button>
                    <button 
                      class="btn btn-sm btn-delete" 
                      (click)="cancelFlight(flight)"
                      title="Cancella volo"
                      *ngIf="flight.status !== 'cancelled' && flight.status !== 'completed'">
                      🗑️
                    </button>
                  </div>
                </div>
                <!-- Messaggio per voli non gestibili -->
                <div *ngIf="!canManageFlight(flight)" class="no-permission">
                  <span class="lock-icon" [title]="getNoPermissionMessage(flight)">
                    🔒
                  </span>
                  <small class="permission-text">
                    {{getNoPermissionMessage(flight)}}
                  </small>
                </div>
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
                <label for="route_id">Rotta *</label>
                <select id="route_id" formControlName="route_id" (change)="onRouteChange()">
                  <option value="">Seleziona rotta</option>
                  <option *ngFor="let route of routes" [value]="route.id">
                    {{route.route_name}} - {{route.departure_code}} → {{route.arrival_code}} ({{route.airline_name}})
                  </option>
                </select>
                <div *ngIf="flightForm.get('route_id')?.invalid && flightForm.get('route_id')?.touched" 
                     class="error">Campo obbligatorio</div>
                <!-- Info rotta selezionata -->
                <div *ngIf="getSelectedRoute()" class="route-info-display">
                  <small class="info-text">
                    ⏱️ Durata stimata: {{getSelectedRoute()?.estimated_duration || 'N/A'}} | 
                    📏 Distanza: {{getSelectedRoute()?.distance_km || 'N/A'}} km |
                    💰 Prezzo base: €{{getSelectedRoute()?.default_price || 'N/A'}}
                  </small>
                  <small class="info-note">
                    Il prezzo finale sarà: Prezzo base (€{{getSelectedRoute()?.default_price || '0'}}) + Sovrapprezzo inserito
                  </small>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="departure_time">Data/Ora Partenza *</label>
                <input 
                  id="departure_time"
                  type="datetime-local" 
                  formControlName="departure_time"
                  (change)="onDepartureTimeChange()">
                <div *ngIf="flightForm.get('departure_time')?.invalid && flightForm.get('departure_time')?.touched" 
                     class="error">Campo obbligatorio</div>
              </div>

              <div class="form-group">
                <label for="arrival_time">Data/Ora Arrivo *</label>
                <input 
                  id="arrival_time"
                  type="datetime-local" 
                  formControlName="arrival_time"
                  readonly
                  class="readonly-field">
                <div *ngIf="flightForm.get('arrival_time')?.invalid && flightForm.get('arrival_time')?.touched" 
                     class="error">Campo obbligatorio</div>
                <small class="info-text">
                  ℹ️ Calcolato automaticamente dalla rotta e orario di partenza
                </small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="price">Sovrapprezzo (€) *</label>
                <input 
                  id="price"
                  type="number" 
                  formControlName="price"
                  min="0"
                  step="0.01"
                  placeholder="Inserisci sovrapprezzo al prezzo base">
                <div *ngIf="flightForm.get('price')?.invalid && flightForm.get('price')?.touched" 
                     class="error">Campo obbligatorio</div>
                <small class="info-text">
                  ℹ️ Questo è il sovrapprezzo che verrà aggiunto al prezzo base della rotta
                </small>
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
              
              <!-- Bottone per eliminare definitivamente il volo (solo in modifica) -->
              <button 
                type="button" 
                class="btn btn-delete-permanent" 
                (click)="deleteFlight()"
                *ngIf="isEditing"
                style="background: #dc3545; color: white; margin-right: 10px;">
                🗑️ Elimina Definitivamente
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

      <!-- Modal per ritardo volo -->
      <div *ngIf="showDelayModal" class="modal-overlay" (click)="closeDelayModal()">
        <div class="modal-content delay-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>⏰ Aggiungi Ritardo al Volo</h2>
            <button class="close-btn" (click)="closeDelayModal()">✕</button>
          </div>

          <div class="delay-content" *ngIf="selectedFlightForDelay">
            <div class="flight-info">
              <h3>{{selectedFlightForDelay.flight_number}} - {{selectedFlightForDelay.airline_name}}</h3>
              <p class="route">{{selectedFlightForDelay.departure_code}} → {{selectedFlightForDelay.arrival_code}}</p>
              
              <div class="current-times">
                <div class="time-info">
                  <strong>⏰ Orario Attuale Partenza:</strong>
                  <span class="time">{{formatDateTime(selectedFlightForDelay.departure_time)}}</span>
                </div>
                <div class="time-info">
                  <strong>🛬 Orario Attuale Arrivo:</strong>
                  <span class="time">{{formatDateTime(selectedFlightForDelay.arrival_time)}}</span>
                </div>
              </div>
            </div>

            <div class="delay-form">
              <div class="form-group">
                <label for="delayMinutes">Ritardo (minuti)</label>
                <select id="delayMinutes" [(ngModel)]="delayMinutes" class="form-control">
                  <option value="15">15 minuti</option>
                  <option value="30">30 minuti</option>
                  <option value="45">45 minuti</option>
                  <option value="60">1 ora</option>
                  <option value="90">1 ora e 30 minuti</option>
                  <option value="120">2 ore</option>
                  <option value="180">3 ore</option>
                  <option value="240">4 ore</option>
                </select>
              </div>

              <div class="new-times" *ngIf="delayMinutes > 0">
                <h4>🕐 Nuovi Orari (con ritardo di {{delayMinutes}} minuti):</h4>
                <div class="time-info predicted">
                  <strong>✈️ Nuova Partenza:</strong>
                  <span class="time">{{selectedFlightForDelay ? calculateNewTime(selectedFlightForDelay.departure_time || '', delayMinutes) : 'N/A'}}</span>
                </div>
                <div class="time-info predicted">
                  <strong>🛬 Nuovo Arrivo:</strong>
                  <span class="time">{{selectedFlightForDelay ? calculateNewTime(selectedFlightForDelay.arrival_time || '', delayMinutes) : 'N/A'}}</span>
                </div>
              </div>
            </div>

            <div class="delay-actions">
              <button class="btn btn-cancel" (click)="closeDelayModal()">
                ❌ Annulla
              </button>
              <button class="btn btn-delay-confirm" (click)="confirmDelay()" [disabled]="isLoading">
                <span *ngIf="isLoading" class="loading-spinner"></span>
                ⏰ Conferma Ritardo
              </button>
            </div>
          </div>
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
  routes: Route[] = []; // ← NUOVO: Array delle rotte

  // Form e modal
  flightForm!: FormGroup; // Inizializzato in ngOnInit
  showModal = false;
  isEditing = false;
  editingFlightId: number | null = null;
  isLoading = false;

  // Modal per ritardo
  showDelayModal = false;
  selectedFlightForDelay: Flight | null = null;
  delayMinutes = 30; // Default delay in minutes

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
    private routeAdminService: RouteAdminService, // ← NUOVO: Servizio per le rotte
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
      route_id: ['', [Validators.required]], // ← NUOVO: Route ID invece di aeroporti separati
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
        // Campi aggiornati per nuova struttura:
        aircraft_id: 1,
        route_id: 1, // ← NUOVO: ID della rotta invece di aeroporti separati
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

    // ← NUOVO: Carica le rotte in base al ruolo dell'utente
    if (this.isAdmin) {
      // Admin può vedere tutte le rotte
      this.routeAdminService.getRoutes().subscribe(routes => {
        this.routes = routes;
        console.log('Admin - Caricate tutte le rotte:', routes);
      });
    } else if (this.airlineId) {
      // Compagnia aerea vede solo le proprie rotte
      this.routeAdminService.getRoutesByAirline(parseInt(this.airlineId)).subscribe({
        next: (routes: Route[]) => {
          this.routes = routes;
          console.log(`Compagnia ${this.airlineId} - Caricate rotte specifiche:`, routes);
        },
        error: (error: any) => {
          console.error('Errore nel caricamento delle rotte della compagnia:', error);
          // Fallback: carica tutte le rotte e filtra lato client
          this.routeAdminService.getRoutes().subscribe(allRoutes => {
            this.routes = allRoutes.filter(route => route.airline_id === parseInt(this.airlineId!));
            console.log('Fallback - Rotte filtrate lato client:', this.routes);
          });
        }
      });
    } else {
      // Caso fallback: carica tutte le rotte
      this.routeAdminService.getRoutes().subscribe(routes => {
        this.routes = routes;
      });
    }

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
        (flight.arrival_airport?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (flight.route_name?.toLowerCase().includes(this.searchTerm.toLowerCase())); // ← NUOVO: Ricerca anche nel nome della rotta
      
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
      route_id: flight.route_id || '', // ← NUOVO: Route ID invece di aeroporti separati
      departure_time: departureTime,
      arrival_time: arrivalTime,
      price: flight.price || 0, // Questo è già il sovrapprezzo salvato nel database
      status: flight.status || 'scheduled'
      // Non impostare total_seats e available_seats - saranno calcolati automaticamente
    });
    
    this.showModal = true;
  }

  completeFlight(flight: Flight) {
    if (!this.canManageFlight(flight)) {
      alert('Non hai i permessi per completare questo volo');
      return;
    }

    if (flight.status === 'completed') {
      alert('Il volo è già stato completato');
      return;
    }

    if (flight.status === 'cancelled') {
      alert('Non è possibile completare un volo cancellato');
      return;
    }

    if (confirm(`Sei sicuro di voler segnare come completato il volo ${flight.flight_number}? Questa azione cambierà lo stato del volo in "Completato".`)) {
      this.isLoading = true;

      // Prepara i dati aggiornati mantenendo tutti i campi originali ma cambiando solo lo status
      const updatedFlightData: FlightFormData = {
        flight_number: flight.flight_number || '',
        airline_id: flight.airline_id || 0,
        aircraft_id: flight.aircraft_id || 0,
        route_id: flight.route_id || 0,
        departure_time: flight.departure_time ? new Date(flight.departure_time).toISOString().slice(0, 16) : '',
        arrival_time: flight.arrival_time ? new Date(flight.arrival_time).toISOString().slice(0, 16) : '',
        price: flight.price || 0,
        total_seats: flight.total_seats || 0,
        available_seats: 0, // Quando un volo è completato, tutti i posti sono occupati
        status: 'completed' // Cambia lo stato in "completed"
      };

      console.log('Completing flight (changing status to completed):', updatedFlightData);

      this.flightAdminService.updateFlight(flight.id, updatedFlightData).subscribe({
        next: () => {
          this.loadFlights();
          alert(`Volo ${flight.flight_number} completato con successo. Lo stato è stato cambiato in "Completato".`);
        },
        error: (error) => {
          console.error('Errore nel completamento del volo:', error);
          alert('Errore nel completamento del volo: ' + (error.error?.error || 'Errore sconosciuto'));
          this.isLoading = false;
        }
      });
    }
  }

  cancelFlight(flight: Flight) {
    if (!this.canManageFlight(flight)) {
      alert('Non hai i permessi per cancellare questo volo');
      return;
    }

    if (flight.status === 'cancelled') {
      alert('Il volo è già stato cancellato');
      return;
    }

    if (confirm(`Sei sicuro di voler cancellare il volo ${flight.flight_number}? Questa azione cambierà lo stato del volo in "Cancellato".`)) {
      this.isLoading = true;

      // Prepara i dati aggiornati mantenendo tutti i campi originali ma cambiando solo lo status
      const updatedFlightData: FlightFormData = {
        flight_number: flight.flight_number || '',
        airline_id: flight.airline_id || 0,
        aircraft_id: flight.aircraft_id || 0,
        route_id: flight.route_id || 0,
        departure_time: flight.departure_time ? new Date(flight.departure_time).toISOString().slice(0, 16) : '',
        arrival_time: flight.arrival_time ? new Date(flight.arrival_time).toISOString().slice(0, 16) : '',
        price: flight.price || 0,
        total_seats: flight.total_seats || 0,
        available_seats: flight.available_seats || 0,
        status: 'cancelled' // Cambia solo lo stato in "cancelled"
      };

      console.log('Cancelling flight (changing status to cancelled):', updatedFlightData);

      this.flightAdminService.updateFlight(flight.id, updatedFlightData).subscribe({
        next: () => {
          this.loadFlights();
          alert(`Volo ${flight.flight_number} cancellato con successo. Lo stato è stato cambiato in "Cancellato".`);
        },
        error: (error) => {
          console.error('Errore nella cancellazione del volo:', error);
          alert('Errore nella cancellazione del volo: ' + (error.error?.error || 'Errore sconosciuto'));
          this.isLoading = false;
        }
      });
    }
  }

  addDelay(flight: Flight) {
    if (!this.canManageFlight(flight)) {
      alert('Non hai i permessi per modificare questo volo');
      return;
    }

    if (flight.status !== 'scheduled' && flight.status !== 'delayed') {
      alert('Puoi aggiungere ritardi solo ai voli programmati o già ritardati');
      return;
    }

    this.selectedFlightForDelay = flight;
    this.delayMinutes = 30; // Reset to default
    this.showDelayModal = true;
  }

  calculateNewTime(originalTime: string, delayMinutes: number): string {
    if (!originalTime) return 'N/A';
    
    try {
      const originalDate = new Date(originalTime);
      const newDate = new Date(originalDate.getTime() + (delayMinutes * 60 * 1000));
      
      return newDate.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Errore calcolo';
    }
  }

  confirmDelay() {
    if (!this.selectedFlightForDelay || this.isLoading) return;

    // Controlli di sicurezza per i campi required
    if (!this.selectedFlightForDelay.departure_time || !this.selectedFlightForDelay.arrival_time) {
      alert('Errore: Orari del volo non validi');
      return;
    }

    this.isLoading = true;

    // Calcola i nuovi orari
    const originalDeparture = new Date(this.selectedFlightForDelay.departure_time);
    const originalArrival = new Date(this.selectedFlightForDelay.arrival_time);
    
    const newDeparture = new Date(originalDeparture.getTime() + (this.delayMinutes * 60 * 1000));
    const newArrival = new Date(originalArrival.getTime() + (this.delayMinutes * 60 * 1000));

    // Prepara i dati aggiornati con controlli di sicurezza
    const updatedFlightData: FlightFormData = {
      flight_number: this.selectedFlightForDelay.flight_number || '',
      airline_id: this.selectedFlightForDelay.airline_id || 0,
      aircraft_id: this.selectedFlightForDelay.aircraft_id || 0,
      route_id: this.selectedFlightForDelay.route_id || 0,
      departure_time: newDeparture.toISOString().slice(0, 16),
      arrival_time: newArrival.toISOString().slice(0, 16),
      price: this.selectedFlightForDelay.price || 0,
      total_seats: this.selectedFlightForDelay.total_seats || 0,
      available_seats: this.selectedFlightForDelay.available_seats || 0,
      status: 'delayed' // Cambia lo stato a "delayed"
    };

    console.log('Updating flight with delay:', updatedFlightData);

    this.flightAdminService.updateFlight(this.selectedFlightForDelay.id, updatedFlightData).subscribe({
      next: () => {
        this.closeDelayModal();
        this.loadFlights();
        alert(`Ritardo di ${this.delayMinutes} minuti aggiunto al volo ${this.selectedFlightForDelay?.flight_number}`);
      },
      error: (error) => {
        console.error('Errore nell\'aggiornamento del ritardo:', error);
        alert('Errore nell\'aggiunta del ritardo: ' + (error.error?.error || 'Errore sconosciuto'));
        this.isLoading = false;
      }
    });
  }

  closeDelayModal() {
    this.showDelayModal = false;
    this.selectedFlightForDelay = null;
    this.delayMinutes = 30;
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

      // Salva solo il sovrapprezzo inserito dall'utente (non sommato al prezzo base)
      const surcharge = formData.price || 0;
      console.log(`Salvando solo il sovrapprezzo: €${surcharge}`);

      // Prepara i dati del volo con posti automatici e solo il sovrapprezzo
      const flightData: FlightFormData = {
        ...formData,
        price: surcharge, // Salva solo il sovrapprezzo inserito
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

  deleteFlight() {
    if (!this.editingFlightId) {
      alert('Errore: Nessun volo selezionato per l\'eliminazione');
      return;
    }

    // Trova il volo corrente per mostrare informazioni nel messaggio di conferma
    const currentFlight = this.flights.find(f => f.id === this.editingFlightId);
    const flightInfo = currentFlight ? 
      `${currentFlight.flight_number} (${currentFlight.departure_code} → ${currentFlight.arrival_code})` : 
      'questo volo';

    if (confirm(`⚠️ ATTENZIONE: Sei sicuro di voler eliminare DEFINITIVAMENTE il volo ${flightInfo}?\n\nQuesta azione è IRREVERSIBILE e rimuoverà completamente il volo dal database.\n\nPer annullare temporaneamente un volo, usa invece il bottone "Cancella" nella tabella.`)) {
      this.isLoading = true;

      this.flightAdminService.deleteFlight(this.editingFlightId).subscribe({
        next: () => {
          this.closeModal();
          this.loadFlights();
          alert(`✅ Volo ${flightInfo} eliminato definitivamente dal sistema.`);
        },
        error: (error) => {
          console.error('Errore nell\'eliminazione del volo:', error);
          alert('❌ Errore nell\'eliminazione del volo: ' + (error.error?.error || 'Errore sconosciuto'));
          this.isLoading = false;
        }
      });
    }
  }

  onAircraftChange() {
    // Non fare nulla - i posti saranno calcolati automaticamente quando si salva
    // Questo metodo può essere rimosso o usato per aggiornamenti UI
  }

  onRouteChange() {
    // Calcola automaticamente l'orario di arrivo quando cambia la rotta
    this.calculateArrivalTime();
    // Imposta automaticamente il prezzo dalla rotta
    this.setDefaultPriceFromRoute();
  }

  onDepartureTimeChange() {
    // Calcola automaticamente l'orario di arrivo quando cambia l'orario di partenza
    this.calculateArrivalTime();
  }

  private calculateArrivalTime() {
    const routeId = this.flightForm.get('route_id')?.value;
    const departureTime = this.flightForm.get('departure_time')?.value;

    if (!routeId || !departureTime) {
      // Se manca la rotta o l'orario di partenza, pulisci l'orario di arrivo
      this.flightForm.patchValue({ arrival_time: '' });
      return;
    }

    // Trova la rotta selezionata
    const selectedRoute = this.routes.find(route => route.id == routeId);
    if (!selectedRoute || !selectedRoute.estimated_duration) {
      console.log('Rotta non trovata o durata mancante');
      return;
    }

    try {
      // Calcola l'orario di arrivo
      const arrivalTime = this.addDurationToDateTime(departureTime, selectedRoute.estimated_duration);
      this.flightForm.patchValue({ arrival_time: arrivalTime });
      console.log(`Orario arrivo calcolato: ${arrivalTime} (durata rotta: ${selectedRoute.estimated_duration})`);
    } catch (error) {
      console.error('Errore nel calcolo dell\'orario di arrivo:', error);
    }
  }

  private setDefaultPriceFromRoute() {
    const routeId = this.flightForm.get('route_id')?.value;
    
    if (!routeId) {
      return;
    }

    // Trova la rotta selezionata
    const selectedRoute = this.routes.find(route => route.id == routeId);
    if (!selectedRoute || !selectedRoute.default_price) {
      console.log('Rotta non trovata o prezzo mancante');
      return;
    }

    // Imposta il sovrapprezzo a 0 di default quando si seleziona una rotta
    // L'utente può poi modificare questo valore per aggiungere un sovrapprezzo
    const currentPrice = this.flightForm.get('price')?.value;
    if (!currentPrice || currentPrice === 0) {
      this.flightForm.patchValue({ price: 0 });
      console.log(`Sovrapprezzo impostato a €0 (prezzo base rotta: €${selectedRoute.default_price})`);
    }
  }

  private addDurationToDateTime(dateTimeString: string, duration: string): string {
    if (!dateTimeString || !duration) return '';

    try {
      const departureDate = new Date(dateTimeString);
      
      // Parse della durata nel formato "HH:MM:SS" o "HH:MM"
      const durationParts = duration.split(':');
      const hours = parseInt(durationParts[0] || '0', 10);
      const minutes = parseInt(durationParts[1] || '0', 10);
      const seconds = parseInt(durationParts[2] || '0', 10);

      // Aggiungi la durata alla data di partenza
      const arrivalDate = new Date(departureDate.getTime() + 
        (hours * 60 * 60 * 1000) + 
        (minutes * 60 * 1000) + 
        (seconds * 1000)
      );

      // Converti nel formato datetime-local
      return arrivalDate.toISOString().slice(0, 16);
    } catch (error) {
      console.error('Errore nel parsing della durata:', error);
      return '';
    }
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

  // Nuovo metodo per ottenere la rotta selezionata
  getSelectedRoute(): Route | null {
    const routeId = this.flightForm.get('route_id')?.value;
    if (routeId) {
      return this.routes.find(route => route.id == routeId) || null;
    }
    return null;
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
    // Debug: log dei dati per troubleshooting
    console.log('=== canManageFlight DEBUG ===');
    console.log('Flight:', flight);
    console.log('Flight airline_id:', flight.airline_id);
    console.log('Current user:', this.currentUser);
    console.log('Current user role:', this.currentUser?.role);
    console.log('Current user airline_id:', this.currentUser?.airline_id);
    console.log('Global airlineId (string):', this.airlineId);
    console.log('Is Admin:', this.isAdmin);
    
    // Se è admin, può gestire tutti i voli
    if (this.isAdmin) {
      console.log('User is admin - CAN MANAGE');
      console.log('============================');
      return true;
    }
    
    // Se non è una compagnia aerea, non può gestire nulla
    if (this.currentUser?.role !== 'airline') {
      console.log('User is not airline - CANNOT MANAGE');
      console.log('============================');
      return false;
    }
    
    // Verifica che abbia un airline_id
    const userAirlineId = this.currentUser?.airline_id || (this.airlineId ? parseInt(this.airlineId) : null);
    if (!userAirlineId) {
      console.log('No airline_id found - CANNOT MANAGE');
      console.log('============================');
      return false;
    }
    
    // Verifica che il volo appartenga alla sua compagnia
    const canManage = flight.airline_id === userAirlineId;
    console.log('User airline_id:', userAirlineId);
    console.log('Flight airline_id:', flight.airline_id);
    console.log('Match:', canManage ? 'YES - CAN MANAGE' : 'NO - CANNOT MANAGE');
    console.log('============================');
    
    return canManage;
  }

  getNoPermissionMessage(flight: Flight): string {
    if (this.isAdmin) {
      return 'Errore: Admin dovrebbe poter gestire tutti i voli';
    }
    
    if (this.currentUser?.role !== 'airline') {
      return 'Solo le compagnie aeree possono gestire i voli';
    }
    
    const userAirlineId = this.currentUser?.airline_id || (this.airlineId ? parseInt(this.airlineId) : null);
    if (!userAirlineId) {
      return 'Nessuna compagnia aerea associata';
    }
    
    if (flight.airline_id !== userAirlineId) {
      return "";
    }
    
    return 'Permessi insufficienti';
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
