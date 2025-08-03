import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AircraftAdminService, Aircraft, AircraftFormData } from '../services/aircraft-admin.service';

@Component({
  selector: 'app-aircraft-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="aircraft-admin-container">
      <!-- Header -->
      <div class="admin-header">
        <div class="header-info">
          <h1>✈️ Gestione Flotta</h1>
          <p class="subtitle">Crea e gestisci gli aeromobili della compagnia aerea</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
    filterAircrafts() {
    if (!Array.isArray(this.aircrafts)) {
      this.filteredAircrafts = [];
      return;
    }
    
    if (this.selectedStatus) {
      this.filteredAircrafts = this.aircrafts.filter(aircraft => 
        aircraft.status === this.selectedStatus
      );
    } else {
      this.filteredAircrafts = this.aircrafts;
    }
  } Nuovo Aeromobile
        </button>
      </div>

      <!-- Statistiche rapide -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ aircrafts.length }}</div>
          <div class="stat-label">Aeromobili Totali</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ getActiveAircrafts() }}</div>
          <div class="stat-label">Attivi</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ getMaintenanceAircrafts() }}</div>
          <div class="stat-label">In Manutenzione</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ getTotalSeats() }}</div>
          <div class="stat-label">Posti Totali</div>
        </div>
      </div>

      <!-- Tabella aeromobili -->
      <div class="aircrafts-table-container">
        <div class="table-header">
          <h2>Lista Aeromobili</h2>
          <div class="filters">
            <select [(ngModel)]="selectedStatus" (change)="filterByStatus()">
              <option value="">Tutti gli stati</option>
              <option value="active">Attivi</option>
              <option value="maintenance">In Manutenzione</option>
              <option value="retired">Ritirati</option>
            </select>
          </div>
        </div>

        <table class="aircrafts-table">
          <thead>
            <tr>
              <th>Registrazione</th>
              <th>Aeromobile</th>
              <th>Compagnia</th>
              <th>Capacità</th>
              <th>Classe Business</th>
              <th>Classe Economy</th>
              <th>Anno</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let aircraft of filteredAircrafts; trackBy: trackByAircraftId">
              <td class="registration">
                <strong>{{ aircraft.registration }}</strong>
              </td>
              <td class="aircraft-info">
                <div class="aircraft-model">
                  <span class="manufacturer">{{ aircraft.manufacturer }}</span>
                  <span class="model">{{ aircraft.model }}</span>
                </div>
                <div class="aircraft-type">{{ aircraft.aircraft_type }}</div>
              </td>
              <td class="airline">
                <span class="airline-name">{{ aircraft.airline_name || 'N/A' }}</span>
              </td>
              <td class="capacity">
                <span class="total-seats">{{ aircraft.seat_capacity }}</span>
              </td>
              <td class="business-seats">
                {{ aircraft.business_class_seats }}
              </td>
              <td class="economy-seats">
                {{ aircraft.economy_class_seats }}
              </td>
              <td class="year">
                {{ aircraft.manufacturing_year || 'N/A' }}
              </td>
              <td class="status">
                <select 
                  [value]="aircraft.status" 
                  (change)="updateAircraftStatus(aircraft.id, $event)"
                  class="status-select"
                  [class]="'status-' + aircraft.status">
                  <option value="active">Attivo</option>
                  <option value="maintenance">Manutenzione</option>
                  <option value="retired">Ritirato</option>
                </select>
              </td>
              <td class="actions">
                <button class="btn-edit" (click)="editAircraft(aircraft)" title="Modifica">
                  ✏️
                </button>
                <button class="btn-delete" (click)="confirmDelete(aircraft)" title="Elimina">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="filteredAircrafts.length === 0" class="no-data">
          <div class="no-data-icon">✈️</div>
          <h3>Nessun aeromobile trovato</h3>
          <p>Non ci sono aeromobili che corrispondono ai criteri di ricerca.</p>
          <button class="btn btn-primary" (click)="openCreateModal()">
            Aggiungi il primo aeromobile
          </button>
        </div>
      </div>

      <!-- Modal per creazione/modifica -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isEditMode ? 'Modifica Aeromobile' : 'Nuovo Aeromobile' }}</h2>
            <button class="close-btn" (click)="closeModal()">×</button>
          </div>

          <form [formGroup]="aircraftForm" (ngSubmit)="onSubmit()">
            <div class="form-grid">
              <div class="form-group">
                <label for="registration">Registrazione *</label>
                <input 
                  id="registration"
                  type="text" 
                  formControlName="registration" 
                  placeholder="Es: I-BIKE"
                  [class.error]="aircraftForm.get('registration')?.invalid && aircraftForm.get('registration')?.touched"
                />
                <div *ngIf="aircraftForm.get('registration')?.invalid && aircraftForm.get('registration')?.touched" class="error">
                  <div *ngIf="aircraftForm.get('registration')?.errors?.['required']">Campo obbligatorio</div>
                  <div *ngIf="aircraftForm.get('registration')?.errors?.['pattern']">Formato non valido (usa lettere maiuscole, numeri e trattini)</div>
                </div>
                <div *ngIf="registrationExistsWarning" class="warning">
                  ⚠️ {{ registrationExistsWarning }}
                </div>
              </div>

              <div class="form-group">
                <label for="aircraft_type">Tipo Aeromobile *</label>
                <select id="aircraft_type" formControlName="aircraft_type">
                  <option value="">Seleziona tipo</option>
                  <option value="Commercial">Commerciale</option>
                  <option value="Cargo">Cargo</option>
                  <option value="Private">Privato</option>
                  <option value="Charter">Charter</option>
                </select>
                <div *ngIf="aircraftForm.get('aircraft_type')?.invalid && aircraftForm.get('aircraft_type')?.touched" class="error">
                  Campo obbligatorio
                </div>
              </div>

              <div class="form-group">
                <label for="manufacturer">Produttore *</label>
                <select id="manufacturer" formControlName="manufacturer">
                  <option value="">Seleziona produttore</option>
                  <option value="Boeing">Boeing</option>
                  <option value="Airbus">Airbus</option>
                  <option value="Embraer">Embraer</option>
                  <option value="Bombardier">Bombardier</option>
                  <option value="ATR">ATR</option>
                  <option value="Altri">Altri</option>
                </select>
                <div *ngIf="aircraftForm.get('manufacturer')?.invalid && aircraftForm.get('manufacturer')?.touched" class="error">
                  Campo obbligatorio
                </div>
              </div>

              <div class="form-group">
                <label for="model">Modello *</label>
                <input 
                  id="model"
                  type="text" 
                  formControlName="model" 
                  placeholder="Es: 737-800, A320"
                />
                <div *ngIf="aircraftForm.get('model')?.invalid && aircraftForm.get('model')?.touched" class="error">
                  Campo obbligatorio
                </div>
              </div>

              <div class="form-group">
                <label for="seat_capacity">Capacità Totale *</label>
                <input 
                  id="seat_capacity"
                  type="number" 
                  formControlName="seat_capacity" 
                  placeholder="180"
                  min="1"
                  max="850"
                />
                <div *ngIf="aircraftForm.get('seat_capacity')?.invalid && aircraftForm.get('seat_capacity')?.touched" class="error">
                  Inserire una capacità valida (1-850)
                </div>
              </div>

              <div class="form-group">
                <label for="business_class_seats">Posti Business</label>
                <input 
                  id="business_class_seats"
                  type="number" 
                  formControlName="business_class_seats" 
                  placeholder="20"
                  min="0"
                />
                <div *ngIf="aircraftForm.get('business_class_seats')?.invalid && aircraftForm.get('business_class_seats')?.touched" class="error">
                  Valore non valido
                </div>
              </div>

              <div class="form-group">
                <label for="economy_class_seats">Posti Economy</label>
                <input 
                  id="economy_class_seats"
                  type="number" 
                  formControlName="economy_class_seats" 
                  placeholder="160"
                  readonly
                />
                <small class="helper-text">Calcolato automaticamente</small>
              </div>

              <div class="form-group">
                <label for="manufacturing_year">Anno di Produzione</label>
                <input 
                  id="manufacturing_year"
                  type="number" 
                  formControlName="manufacturing_year" 
                  placeholder="2020"
                  min="1950"
                  [max]="currentYear"
                />
                <div *ngIf="aircraftForm.get('manufacturing_year')?.invalid && aircraftForm.get('manufacturing_year')?.touched" class="error">
                  Anno non valido (1950-{{ currentYear }})
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">
                Annulla
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="aircraftForm.invalid || isSubmitting">
                {{ isSubmitting ? 'Salvando...' : (isEditMode ? 'Aggiorna' : 'Crea') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal di conferma eliminazione -->
      <div class="modal-overlay" *ngIf="showDeleteModal" (click)="closeDeleteModal()">
        <div class="modal modal-small" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Conferma Eliminazione</h2>
            <button class="close-btn" (click)="closeDeleteModal()">×</button>
          </div>
          <div class="modal-body">
            <p>Sei sicuro di voler eliminare l'aeromobile <strong>{{ aircraftToDelete?.registration }}</strong>?</p>
            <p class="warning-text">⚠️ Questa azione non può essere annullata.</p>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="closeDeleteModal()">
              Annulla
            </button>
            <button type="button" class="btn btn-danger" (click)="deleteAircraft()" [disabled]="isDeleting">
              {{ isDeleting ? 'Eliminando...' : 'Elimina' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .aircraft-admin-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* Header */
    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      color: white;
    }

    .header-info h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      margin: 0;
    }

    /* Statistiche */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      border-left: 4px solid #667eea;
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #6b7280;
      font-weight: 500;
    }

    /* Tabella */
    .aircrafts-table-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .table-header h2 {
      margin: 0;
      color: #1a202c;
      font-size: 1.5rem;
    }

    .filters select {
      padding: 0.5rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: white;
    }

    .aircrafts-table {
      width: 100%;
      border-collapse: collapse;
    }

    .aircrafts-table th {
      background: #667eea;
      color: white;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .aircrafts-table td {
      padding: 1rem;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    .aircrafts-table tr:hover {
      background: #f8fafc;
    }

    .registration strong {
      color: #667eea;
      font-family: monospace;
      font-size: 1.1rem;
    }

    .aircraft-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .aircraft-model {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .manufacturer {
      font-weight: 600;
      color: #1a202c;
    }

    .model {
      color: #667eea;
      font-weight: 500;
    }

    .aircraft-type {
      font-size: 0.85rem;
      color: #6b7280;
      background: #f3f4f6;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
    }

    .status-select {
      padding: 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      font-size: 0.85rem;
    }

    .status-active { border-color: #10b981; color: #065f46; }
    .status-maintenance { border-color: #f59e0b; color: #92400e; }
    .status-retired { border-color: #ef4444; color: #991b1b; }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-edit, .btn-delete {
      padding: 0.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: transform 0.2s;
    }

    .btn-edit {
      background: #fef3c7;
      color: #92400e;
    }

    .btn-delete {
      background: #fee2e2;
      color: #991b1b;
    }

    .btn-edit:hover, .btn-delete:hover {
      transform: scale(1.1);
    }

    /* No data */
    .no-data {
      text-align: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }

    .no-data-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .no-data h3 {
      margin: 1rem 0;
      color: #374151;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 16px;
      max-width: 800px;
      width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-small {
      max-width: 500px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem 2rem 1rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h2 {
      margin: 0;
      color: #1a202c;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 2rem;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-body {
      padding: 1.5rem 2rem;
    }

    .warning-text {
      color: #dc2626;
      font-weight: 500;
      margin-top: 1rem;
    }

    /* Form */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      padding: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .form-group input,
    .form-group select {
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group input.error {
      border-color: #ef4444;
    }

    .form-group input[readonly] {
      background: #f9fafb;
      color: #6b7280;
    }

    .helper-text {
      color: #6b7280;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .error {
      color: #ef4444;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .warning {
      color: #f59e0b;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 0 2rem 2rem;
    }

    /* Buttons */
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .aircraft-admin-container {
        padding: 1rem;
      }

      .admin-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .header-info h1 {
        font-size: 2rem;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .table-header {
        flex-direction: column;
        gap: 1rem;
      }

      .aircrafts-table {
        font-size: 0.85rem;
      }

      .aircrafts-table th,
      .aircrafts-table td {
        padding: 0.5rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
        padding: 1rem;
      }

      .form-actions {
        flex-direction: column;
        padding: 0 1rem 1rem;
      }
    }
  `]
})
export class AircraftAdminComponent implements OnInit {
  aircrafts: Aircraft[] = [];
  filteredAircrafts: Aircraft[] = [];
  selectedStatus: string = '';
  
  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  isSubmitting = false;
  isDeleting = false;
  aircraftToDelete: Aircraft | null = null;
  registrationExistsWarning = '';
  
  aircraftForm!: FormGroup;
  currentYear = new Date().getFullYear();

  constructor(
    private aircraftService: AircraftAdminService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    console.log('AircraftAdminComponent: ngOnInit called');
    
    // Verifica token e ruolo utente
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('User payload:', payload);
        console.log('User role:', payload.role);
        console.log('Airline ID:', payload.airlineId);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
    
    this.loadAircrafts();
    this.setupFormSubscriptions();
  }

  private initializeForm() {
    this.aircraftForm = this.fb.group({
      registration: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)]],
      aircraft_type: ['', Validators.required],
      manufacturer: ['', Validators.required],
      model: ['', Validators.required],
      seat_capacity: ['', [Validators.required, Validators.min(1), Validators.max(850)]],
      business_class_seats: ['', [Validators.min(0)]],
      economy_class_seats: [''],
      manufacturing_year: ['', [Validators.min(1950), Validators.max(this.currentYear)]]
    });
  }

  private setupFormSubscriptions() {
    // Auto-calculate economy seats
    this.aircraftForm.get('seat_capacity')?.valueChanges.subscribe(() => this.updateEconomySeats());
    this.aircraftForm.get('business_class_seats')?.valueChanges.subscribe(() => this.updateEconomySeats());

    // Check registration exists
    this.aircraftForm.get('registration')?.valueChanges.subscribe(value => {
      if (value && value.length >= 3 && !this.isEditMode) {
        this.checkRegistrationExists(value);
      } else {
        this.registrationExistsWarning = '';
      }
    });
  }

  private updateEconomySeats() {
    const totalSeats = this.aircraftForm.get('seat_capacity')?.value || 0;
    const businessSeats = this.aircraftForm.get('business_class_seats')?.value || 0;
    const economySeats = Math.max(0, totalSeats - businessSeats);
    
    this.aircraftForm.get('economy_class_seats')?.setValue(economySeats, { emitEvent: false });
  }

  private checkRegistrationExists(registration: string) {
    this.aircraftService.checkRegistrationExists(registration).subscribe({
      next: (result) => {
        this.registrationExistsWarning = result.exists ? 
          'Registrazione già esistente!' : '';
      },
      error: () => {
        this.registrationExistsWarning = '';
      }
    });
  }

  loadAircrafts() {
    console.log('AircraftAdminComponent: Loading aircrafts...');
    this.aircraftService.getMyAircrafts().subscribe({
      next: (aircrafts) => {
        console.log('AircraftAdminComponent: Received aircrafts:', aircrafts);
        this.aircrafts = aircrafts;
        this.filteredAircrafts = aircrafts;
        this.aircraftService.updateAircraftsList(aircrafts);
      },
      error: (error) => {
        console.error('AircraftAdminComponent: Error loading aircrafts:', error);
        console.error('Error details:', error.message);
        console.error('Error status:', error.status);
        alert('Errore nel caricamento degli aeromobili: ' + (error.message || 'Errore sconosciuto'));
      }
    });
  }

  filterByStatus() {
    if (this.selectedStatus) {
      this.filteredAircrafts = this.aircrafts.filter(aircraft => 
        aircraft.status === this.selectedStatus
      );
    } else {
      this.filteredAircrafts = this.aircrafts;
    }
  }

  openCreateModal() {
    this.isEditMode = false;
    this.aircraftForm.reset();
    this.registrationExistsWarning = '';
    this.showModal = true;
  }

  editAircraft(aircraft: Aircraft) {
    this.isEditMode = true;
    this.aircraftForm.patchValue(aircraft);
    this.registrationExistsWarning = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.aircraftForm.reset();
    this.registrationExistsWarning = '';
  }

  onSubmit() {
    if (this.aircraftForm.invalid || this.registrationExistsWarning) {
      this.aircraftForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData: AircraftFormData = this.aircraftForm.value;

    const request = this.isEditMode ? 
      this.aircraftService.updateAircraft(this.getEditingAircraftId(), formData) :
      this.aircraftService.createAircraft(formData);

    request.subscribe({
      next: () => {
        this.loadAircrafts();
        this.closeModal();
        alert(this.isEditMode ? 'Aeromobile aggiornato con successo!' : 'Aeromobile creato con successo!');
      },
      error: (error) => {
        console.error('Error saving aircraft:', error);
        alert('Errore nel salvataggio dell\'aeromobile');
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  confirmDelete(aircraft: Aircraft) {
    this.aircraftToDelete = aircraft;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.aircraftToDelete = null;
  }

  deleteAircraft() {
    if (!this.aircraftToDelete) return;

    this.isDeleting = true;
    this.aircraftService.deleteAircraft(this.aircraftToDelete.id).subscribe({
      next: () => {
        this.loadAircrafts();
        this.closeDeleteModal();
        alert('Aeromobile eliminato con successo!');
      },
      error: (error) => {
        console.error('Error deleting aircraft:', error);
        alert('Errore nell\'eliminazione dell\'aeromobile');
      },
      complete: () => {
        this.isDeleting = false;
      }
    });
  }

  updateAircraftStatus(aircraftId: number, event: any) {
    const newStatus = event.target.value;
    this.aircraftService.updateAircraftStatus(aircraftId, newStatus).subscribe({
      next: () => {
        this.loadAircrafts();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        alert('Errore nell\'aggiornamento dello stato');
      }
    });
  }

  // Utility methods
  trackByAircraftId(index: number, aircraft: Aircraft): number {
    return aircraft.id;
  }

  getActiveAircrafts(): number {
    return Array.isArray(this.aircrafts) ? this.aircrafts.filter(a => a.status === 'active').length : 0;
  }

  getMaintenanceAircrafts(): number {
    return Array.isArray(this.aircrafts) ? this.aircrafts.filter(a => a.status === 'maintenance').length : 0;
  }

  getTotalSeats(): number {
    return Array.isArray(this.aircrafts) ? this.aircrafts.reduce((total, aircraft) => total + aircraft.seat_capacity, 0) : 0;
  }

  private getEditingAircraftId(): number {
    return this.aircrafts.find(a => a.registration === this.aircraftForm.get('registration')?.value)?.id || 0;
  }
}
