import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouteAdminService } from '../services/route-admin.service';
import { Route } from '../models/route.model';
import { Airport } from '../models/flight.model';

@Component({
  selector: 'app-route-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="route-admin-container">
      <!-- Header migliorato -->
      <div class="admin-header">
        <div class="header-info">
          <h1>🗺️ Gestione Rotte</h1>
          <p class="subtitle">Crea e gestisci le rotte della compagnia aerea</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
          ➕ Nuova Rotta
        </button>
      </div>

      <!-- Tabella migliorata -->
      <div class="routes-table-container">
        <table class="routes-table">
          <thead>
            <tr>
              <th>Nome Rotta</th>
              <th>Rotta</th>
              <th>Compagnia</th>
              <th>Distanza</th>
              <th>Durata</th>
              <th>Prezzo per Classe</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let route of routes; trackBy: trackByRouteId">
              <td class="route-name">{{ route.route_name }}</td>
              <td class="route">
                <div class="route-info">
                  <span class="airport">{{ route.departure_code }} {{ route.departure_city }}</span>
                  <span class="arrow">→</span>
                  <span class="airport">{{ route.arrival_code }} {{ route.arrival_city }}</span>
                </div>
              </td>
              <td class="airline">
                <span class="airline-info">{{ route.airline_name }} ({{ route.airline_code }})</span>
              </td>
              <td class="distance">{{ route.distance_km }} km</td>
              <td class="duration">{{ route.estimated_duration }}</td>
              <td class="price">
                <div class="price-breakdown">
                  <div class="economy">💺 €{{ route.default_price }}</div>
                  <div *ngIf="route.business_price" class="business">🛋️ €{{ route.business_price }}</div>
                  <div *ngIf="route.first_price" class="first">👑 €{{ route.first_price }}</div>
                </div>
              </td>
              <td>
                <span class="status" [class]="'status-' + route.status">
                  {{ getStatusLabel(route.status) }}
                </span>
              </td>
              <td class="actions">
                <button class="btn btn-sm btn-edit" (click)="openEditModal(route)">✏️</button>
                <button class="btn btn-sm btn-delete" (click)="deleteRoute(route)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="routes.length === 0" class="no-routes">
          <p>📭 Nessuna rotta trovata</p>
          <button class="btn btn-primary" (click)="openCreateModal()">
            ➕ Crea la prima rotta
          </button>
        </div>
      </div>


      <!-- Modal migliorato -->
      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isEditing ? '✏️ Modifica Rotta' : '➕ Nuova Rotta' }}</h2>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <form [formGroup]="routeForm" (ngSubmit)="saveRoute()" class="route-form">
            <div class="form-row">
              <div class="form-group">
                <label for="route_name">Nome Rotta *</label>
                <input 
                  id="route_name"
                  type="text" 
                  formControlName="route_name" 
                  placeholder="es. Roma-Milano Express"
                />
                <div *ngIf="routeForm.get('route_name')?.invalid && routeForm.get('route_name')?.touched" class="error">
                  Campo obbligatorio
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="departure_airport_id">Aeroporto Partenza *</label>
                <select id="departure_airport_id" formControlName="departure_airport_id" (change)="checkRouteExists()">
                  <option value="">Seleziona aeroporto</option>
                  <option *ngFor="let airport of airports" [value]="airport.id">
                    {{ airport.name }} ({{ airport.iata_code }}) - {{ airport.city }}
                  </option>
                </select>
                <div *ngIf="routeForm.get('departure_airport_id')?.invalid && routeForm.get('departure_airport_id')?.touched" class="error">
                  Campo obbligatorio
                </div>
              </div>

              <div class="form-group">
                <label for="arrival_airport_id">Aeroporto Arrivo *</label>
                <select id="arrival_airport_id" formControlName="arrival_airport_id" (change)="checkRouteExists()">
                  <option value="">Seleziona aeroporto</option>
                  <option *ngFor="let airport of airports" [value]="airport.id">
                    {{ airport.name }} ({{ airport.iata_code }}) - {{ airport.city }}
                  </option>
                </select>
                <div *ngIf="routeForm.get('arrival_airport_id')?.invalid && routeForm.get('arrival_airport_id')?.touched" class="error">
                  Campo obbligatorio
                </div>
                <div *ngIf="routeExistsWarning" class="warning">
                  ⚠️ {{ routeExistsWarning }}
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="distance_km">Distanza (km) *</label>
                <input 
                  id="distance_km"
                  type="number" 
                  formControlName="distance_km" 
                  placeholder="580"
                  min="1"
                />
                <div *ngIf="routeForm.get('distance_km')?.invalid && routeForm.get('distance_km')?.touched" class="error">
                  Inserire una distanza valida
                </div>
              </div>

              <div class="form-group">
                <label for="estimated_duration">Durata Prevista *</label>
                <input 
                  id="estimated_duration"
                  type="time" 
                  formControlName="estimated_duration" 
                  placeholder="01:30"
                />
                <div *ngIf="routeForm.get('estimated_duration')?.invalid && routeForm.get('estimated_duration')?.touched" class="error">
                  Campo obbligatorio
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="default_price">Prezzo Economy (€) *</label>
                <input 
                  id="default_price"
                  type="number" 
                  formControlName="default_price" 
                  placeholder="89.99"
                  min="0" 
                  step="0.01"
                />
                <div *ngIf="routeForm.get('default_price')?.invalid && routeForm.get('default_price')?.touched" class="error">
                  Inserire un prezzo valido
                </div>
              </div>

              <div class="form-group">
                <label for="business_price">Prezzo Business (€)</label>
                <input 
                  id="business_price"
                  type="number" 
                  formControlName="business_price" 
                  placeholder="189.99"
                  min="0" 
                  step="0.01"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="first_price">Prezzo First Class (€)</label>
                <input 
                  id="first_price"
                  type="number" 
                  formControlName="first_price" 
                  placeholder="499.99"
                  min="0" 
                  step="0.01"
                />
              </div>

              <div class="form-group">
                <label for="status">Stato</label>
                <select id="status" formControlName="status">
                  <option value="active">✅ Attiva</option>
                  <option value="inactive">❌ Inattiva</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">
                Annulla
              </button>
              <button type="submit" class="btn btn-success" [disabled]="routeForm.invalid">
                {{ isEditing ? '💾 Aggiorna Rotta' : '✨ Crea Rotta' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .route-admin-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      margin-top: 2rem;
      margin-bottom: 2rem;
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e3f2fd;
    }

    .header-info h1 {
      color: #1976d2;
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #666;
      font-size: 0.9rem;
      margin: 0;
    }

    .routes-table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .routes-table {
      width: 100%;
      border-collapse: collapse;
    }

    .routes-table th {
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .routes-table td {
      padding: 1rem;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: middle;
    }

    .routes-table tr:hover {
      background: #f8f9fa;
    }

    .route-name {
      font-weight: 600;
      color: #1976d2;
    }

    .route-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .airport {
      font-weight: 500;
      color: #333;
    }

    .arrow {
      color: #1976d2;
      font-weight: bold;
    }

    .airline-info {
      color: #1976d2;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .distance, .duration {
      color: #666;
      font-size: 0.9rem;
    }

    .price-breakdown {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .price-breakdown .economy {
      color: #2e7d32;
      font-weight: 600;
    }

    .price-breakdown .business {
      color: #f57c00;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .price-breakdown .first {
      color: #7b1fa2;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .status {
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-active {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-inactive {
      background: #ffebee;
      color: #d32f2f;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .no-routes {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .no-routes p {
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
      border-radius: 12px 12px 0 0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .route-form {
      padding: 2rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .form-group input,
    .form-group select {
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.2s;
      background: white;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
    }

    .form-group input::placeholder {
      color: #999;
    }

    .error {
      color: #d32f2f;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      font-weight: 500;
    }

    .warning {
      color: #f57c00;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      font-weight: 500;
      background: #fff3e0;
      padding: 0.5rem;
      border-radius: 4px;
      border-left: 3px solid #f57c00;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    /* Button Styles */
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #1565c0, #0d47a1);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #666;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-success {
      background: linear-gradient(135deg, #2e7d32, #1b5e20);
      color: white;
    }

    .btn-success:hover {
      background: linear-gradient(135deg, #1b5e20, #0f3a13);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
    }

    .btn-success:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-sm {
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
    }

    .btn-edit {
      background: #fff3e0;
      color: #f57c00;
      border: 1px solid #ffcc02;
    }

    .btn-edit:hover {
      background: #f57c00;
      color: white;
    }

    .btn-delete {
      background: #ffebee;
      color: #d32f2f;
      border: 1px solid #ffcdd2;
    }

    .btn-delete:hover {
      background: #d32f2f;
      color: white;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .route-admin-container {
        margin: 1rem;
        padding: 1rem;
      }

      .admin-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .form-row {
        flex-direction: column;
      }

      .modal-content {
        margin: 1rem;
        width: calc(100% - 2rem);
      }

      .route-form {
        padding: 1rem;
      }

      .routes-table {
        font-size: 0.8rem;
      }

      .routes-table th,
      .routes-table td {
        padding: 0.5rem;
      }
    }
  `]
})
export class RouteAdminComponent implements OnInit {
  routes: Route[] = [];
  airports: Airport[] = [];
  showModal = false;
  isEditing = false;
  currentRouteId: number | null = null;
  routeForm: FormGroup;
  routeExistsWarning: string = '';

  constructor(private fb: FormBuilder, private routeService: RouteAdminService) {
    this.routeForm = this.fb.group({
      route_name: ['', Validators.required],
      departure_airport_id: ['', Validators.required],
      arrival_airport_id: ['', Validators.required],
      distance_km: ['', [Validators.required, Validators.min(1)]],
      estimated_duration: ['', Validators.required],
      default_price: [0, [Validators.required, Validators.min(0)]],
      business_price: [0, [Validators.min(0)]],
      first_price: [0, [Validators.min(0)]],
      status: ['active']
    });
  }

  ngOnInit() {
    this.loadAirports();
    this.loadRoutes();
  }

  loadAirports() {
    this.routeService.getAirports().subscribe(data => this.airports = data);
  }

  loadRoutes() {
    // Ottieni l'utente corrente dal localStorage
    const userStr = localStorage.getItem('user');
    const airlineId=localStorage.getItem('airlineId');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'airline') {
        // Se è una compagnia aerea, usa l'endpoint specifico
        this.routeService.getRoutesByAirline(Number(airlineId)).subscribe(data => this.routes = data);
      } else {
        // Se è admin o altro ruolo, usa l'endpoint generale
        this.routeService.getRoutes().subscribe(data => this.routes = data);
      }
    } else {
      // Fallback se non c'è utente loggato
      this.routeService.getRoutes().subscribe(data => this.routes = data);
    }
  }

  openCreateModal() {
    this.isEditing = false;
    this.currentRouteId = null;
    this.routeExistsWarning = '';
    this.routeForm.reset({ 
      status: 'active',
      default_price: 0 
    });
    this.showModal = true;
  }

  openEditModal(route: Route) {
    this.isEditing = true;
    this.currentRouteId = route.id;
    this.routeExistsWarning = '';
    this.routeForm.patchValue(route);
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveRoute() {
    if (this.routeForm.invalid) {
      this.routeForm.markAllAsTouched();
      return;
    }
    
    const formValue = this.routeForm.value;
    // DEBUG: Stato form e valori prima dell'invio
    console.group('[RouteAdmin] Save Route');
    console.debug('Mode:', this.isEditing ? 'edit' : 'create', 'CurrentRouteId:', this.currentRouteId);
    console.debug('Form value (raw):', JSON.parse(JSON.stringify(formValue)));
    
    // Se l'utente è una compagnia aerea, aggiungi l'airline_id dalla localStorage
    const userStr = localStorage.getItem('user');
    const airlineId = localStorage.getItem('airlineId');
    if (userStr) {
      const user = JSON.parse(userStr);
      console.debug('Current user role:', user.role, 'airlineId in storage:', airlineId);
      if (user.role === 'airline' && airlineId) {
        formValue.airline_id = Number(airlineId);
        console.debug('Applied airline_id to payload:', formValue.airline_id);
      }
    }
    
    // Verifica che aeroporto di partenza e arrivo siano diversi
    if (formValue.departure_airport_id === formValue.arrival_airport_id) {
      alert('Aeroporto di partenza e arrivo devono essere diversi!');
      console.warn('[RouteAdmin] Same departure and arrival airport selected. Aborting save.');
      console.groupEnd();
      return;
    }
    
    // Verifica se esiste già una rotta tra questi aeroporti
    const existingRoute = this.routes.find(r => 
      r.departure_airport_id === formValue.departure_airport_id && 
      r.arrival_airport_id === formValue.arrival_airport_id
    );
    
    if (existingRoute && !this.isEditing) {
      if (confirm(`Esiste già una rotta "${existingRoute.route_name}" tra questi aeroporti. Vuoi modificarla invece?`)) {
        this.openEditModal(existingRoute);
        return;
      } else {
        return;
      }
    }
    
  if (this.isEditing && this.currentRouteId) {
    console.debug('Updating route with ID:', this.currentRouteId, 'Payload:', JSON.parse(JSON.stringify(formValue)));
      // Per le compagnie aeree, assicura che airline_id sia sempre presente anche in aggiornamento
      if (!formValue.airline_id) {
        const airlineIdUpdate = localStorage.getItem('airlineId');
        if (airlineIdUpdate) {
          formValue.airline_id = Number(airlineIdUpdate);
      console.debug('Filled missing airline_id for update from storage:', formValue.airline_id);
        }
      }
      this.routeService.updateRoute(this.currentRouteId, formValue).subscribe({
        next: () => {
      console.info('[RouteAdmin] Update successful');
      this.loadRoutes(); 
          this.closeModal();
      console.groupEnd();
        },
        error: (error) => {
      console.error('[RouteAdmin] Update error:', error);
      try { console.error('Server error payload:', error?.error); } catch {}
      console.error('HTTP status:', error?.status, 'URL:', error?.url);
          alert(error.error?.error || 'Errore nell\'aggiornamento della rotta');
      console.groupEnd();
        }
      });
    } else {
    console.debug('Creating route with payload:', JSON.parse(JSON.stringify(formValue)));
      this.routeService.createRoute(formValue).subscribe({
        next: () => {
      console.info('[RouteAdmin] Create successful');
      this.loadRoutes(); 
          this.closeModal();
      console.groupEnd();
        },
        error: (error) => {
      console.error('[RouteAdmin] Create error:', error);
      try { console.error('Server error payload:', error?.error); } catch {}
      console.error('HTTP status:', error?.status, 'URL:', error?.url);
          alert(error.error?.error || error.error?.detail || 'Errore nella creazione della rotta');
      console.groupEnd();
        }
      });
    }
  }

  deleteRoute(route: Route) {
    if (confirm(`Eliminare la rotta ${route.route_name}?`)) {
      this.routeService.deleteRoute(route.id).subscribe(() => this.loadRoutes());
    }
  }

  trackByRouteId(index: number, route: Route): number {
    return route.id;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'active': 'Attiva',
      'inactive': 'Inattiva'
    };
    return labels[status] || status;
  }

  checkRouteExists() {
    const departureId = this.routeForm.get('departure_airport_id')?.value;
    const arrivalId = this.routeForm.get('arrival_airport_id')?.value;
    
    this.routeExistsWarning = '';
    
    if (departureId && arrivalId) {
      if (departureId === arrivalId) {
        this.routeExistsWarning = 'Aeroporto di partenza e arrivo devono essere diversi';
        return;
      }
      
      const existingRoute = this.routes.find(r => 
        r.departure_airport_id == departureId && 
        r.arrival_airport_id == arrivalId
      );
      
      if (existingRoute && (!this.isEditing || existingRoute.id !== this.currentRouteId)) {
        this.routeExistsWarning = `Rotta già esistente: "${existingRoute.route_name}"`;
      }
    }
  }
}
