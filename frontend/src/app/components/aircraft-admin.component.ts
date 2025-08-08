import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AircraftAdminService, Aircraft, AircraftFormData } from '../services/aircraft-admin.service';

@Component({
  selector: 'app-aircraft-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <!-- Loading iniziale -->
    <div *ngIf="isInitializing" class="initial-loading">
      <div class="initial-loading-content">
        <div class="spinner-large"></div>
        <h2>🛩️ Caricamento Gestione Aeromobili...</h2>
        <p>Verifica delle autorizzazioni in corso</p>
      </div>
    </div>

    <!-- Controllo accesso -->
    <div *ngIf="!isInitializing && !canAccess" class="access-denied">
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

    <div *ngIf="!isInitializing && canAccess" class="aircraft-admin-container">
      <!-- Header -->
      <div class="admin-header">
        <div class="header-info">
          <h1>🛩️ Gestione Aeromobili<span *ngIf="isAdmin" class="admin-mode"> - Modalità Admin</span></h1>
          <p *ngIf="isAdmin" class="admin-subtitle">Stai visualizzando tutti gli aeromobili di tutte le compagnie</p>
          <div class="user-info" *ngIf="currentUser">
            <span class="airline-badge">{{currentUser.airline_name || currentUser.first_name}}</span>
            <span class="role-badge">{{getRoleLabel(currentUser.role)}}</span>
          </div>
        </div>
        <button class="nav-style-btn primary-btn" (click)="openCreateModal()">
          ➕ Nuovo Aeromobile
        </button>
      </div>

      <!-- Statistiche -->
      <div class="stats-section" *ngIf="aircrafts.length > 0">
        <div class="stat-card">
          <div class="stat-number">{{aircrafts.length}}</div>
          <div class="stat-label">Aeromobili Totali</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{getActiveAircrafts()}}</div>
          <div class="stat-label">Attivi</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{getMaintenanceAircrafts()}}</div>
          <div class="stat-label">In Manutenzione</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{getTotalSeats()}}</div>
          <div class="stat-label">Posti Totali</div>
        </div>
      </div>

      <!-- Filtri -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Stato:</label>
          <select [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option value="">Tutti</option>
            <option value="active">Attivo</option>
            <option value="maintenance">In Manutenzione</option>
            <option value="retired">Ritirato</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Tipo:</label>
          <select [(ngModel)]="typeFilter" (change)="applyFilters()">
            <option value="">Tutti i tipi</option>
            <option value="Boeing 737">Boeing 737</option>
            <option value="Airbus A320">Airbus A320</option>
            <option value="Boeing 777">Boeing 777</option>
            <option value="Airbus A350">Airbus A350</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Ricerca:</label>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="applyFilters()"
            placeholder="Registrazione, modello...">
        </div>
      </div>

      <!-- Tabella aeromobili -->
      <div class="aircrafts-table-container">
        <table class="aircrafts-table">
          <thead>
            <tr>
              <th>Registrazione</th>
              <th *ngIf="isAdmin">Compagnia</th>
              <th>Tipo/Modello</th>
              <th>Capacità</th>
              <th>Anno</th>
              <th>Stato</th>
              <th>Ultima Manutenzione</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let aircraft of filteredAircrafts; trackBy: trackByAircraftId">
              <td class="registration">
                <strong>{{aircraft.registration}}</strong>
              </td>
              <td *ngIf="isAdmin" class="airline-name">
                <div class="airline-badge-small">{{aircraft.airline_name || 'N/D'}}</div>
              </td>
              <td class="aircraft-info">
                <div class="aircraft-type">{{aircraft.aircraft_type}}</div>
                <div class="aircraft-details">{{aircraft.manufacturer}} {{aircraft.model}}</div>
              </td>
              <td class="capacity">
                <div class="capacity-breakdown">
                  <span class="total-seats">{{aircraft.seat_capacity}} posti</span>
                  <small class="class-breakdown">
                    Business: {{aircraft.business_class_seats}} | 
                    Economy: {{aircraft.economy_class_seats}}
                  </small>
                </div>
              </td>
              <td class="year">
                {{aircraft.manufacturing_year || 'N/A'}}
              </td>
              <td class="status">
                <span class="status-badge" [class]="'status-' + aircraft.status">
                  {{getStatusLabel(aircraft.status)}}
                </span>
              </td>
              <td class="maintenance">
                {{formatDate(aircraft.last_maintenance) || 'Mai'}}
              </td>
              <td class="actions">
                <div class="action-buttons">
                  <button 
                    class="btn btn-sm btn-edit" 
                    (click)="editAircraft(aircraft)"
                    title="Modifica aeromobile">
                    ✏️
                  </button>
                  <button 
                    class="btn btn-sm btn-maintenance" 
                    (click)="toggleMaintenanceStatus(aircraft)"
                    title="{{aircraft.status === 'maintenance' ? 'Termina manutenzione' : 'Inizia manutenzione'}}"
                    [class.active]="aircraft.status === 'maintenance'">
                    🔧
                  </button>
                  <button 
                    class="btn btn-sm btn-delete" 
                    (click)="deleteAircraft(aircraft)"
                    title="Elimina aeromobile">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="filteredAircrafts.length === 0" class="no-aircrafts">
          <div class="empty-state">
            <h3>🛩️ Nessun aeromobile trovato</h3>
            <p *ngIf="aircrafts.length === 0">La tua flotta è vuota. Aggiungi il primo aeromobile!</p>
            <p *ngIf="aircrafts.length > 0">Prova a modificare i filtri di ricerca.</p>
            <button *ngIf="aircrafts.length === 0" class="btn btn-primary" (click)="openCreateModal()">
              ➕ Aggiungi Primo Aeromobile
            </button>
          </div>
        </div>
      </div>

      <!-- Modal per creazione/modifica aeromobile -->
      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content large-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{isEditing ? 'Modifica Aeromobile' : 'Nuovo Aeromobile'}}</h2>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <form [formGroup]="aircraftForm" (ngSubmit)="saveAircraft()" class="aircraft-form">
            <!-- Info di base -->
            <div class="form-section">
              <h3>📋 Informazioni Base</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="registration">Registrazione *</label>
                  <input 
                    id="registration"
                    type="text" 
                    formControlName="registration"
                    placeholder="es. I-ABCD"
                    [class.error]="aircraftForm.get('registration')?.invalid && aircraftForm.get('registration')?.touched">
                  <div *ngIf="aircraftForm.get('registration')?.invalid && aircraftForm.get('registration')?.touched" 
                       class="error-message">Registrazione obbligatoria (formato: I-XXXX)</div>
                </div>

                <div class="form-group">
                  <label for="aircraft_type">Tipo Aeromobile *</label>
                  <select id="aircraft_type" formControlName="aircraft_type">
                    <option value="">Seleziona tipo</option>
                    <option value="Boeing 737">Boeing 737</option>
                    <option value="Boeing 777">Boeing 777</option>
                    <option value="Boeing 787">Boeing 787</option>
                    <option value="Airbus A320">Airbus A320</option>
                    <option value="Airbus A330">Airbus A330</option>
                    <option value="Airbus A350">Airbus A350</option>
                    <option value="Airbus A380">Airbus A380</option>
                  </select>
                  <div *ngIf="aircraftForm.get('aircraft_type')?.invalid && aircraftForm.get('aircraft_type')?.touched" 
                       class="error-message">Tipo aeromobile obbligatorio</div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="manufacturer">Produttore *</label>
                  <select id="manufacturer" formControlName="manufacturer">
                    <option value="">Seleziona produttore</option>
                    <option value="Boeing">Boeing</option>
                    <option value="Airbus">Airbus</option>
                    <option value="Embraer">Embraer</option>
                    <option value="Bombardier">Bombardier</option>
                    <option value="ATR">ATR</option>
                  </select>
                  <div *ngIf="aircraftForm.get('manufacturer')?.invalid && aircraftForm.get('manufacturer')?.touched" 
                       class="error-message">Produttore obbligatorio</div>
                </div>

                <div class="form-group">
                  <label for="model">Modello *</label>
                  <input 
                    id="model"
                    type="text" 
                    formControlName="model"
                    placeholder="es. 737-800, A320-200">
                  <div *ngIf="aircraftForm.get('model')?.invalid && aircraftForm.get('model')?.touched" 
                       class="error-message">Modello obbligatorio</div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="manufacturing_year">Anno di Produzione</label>
                  <input 
                    id="manufacturing_year"
                    type="number" 
                    formControlName="manufacturing_year"
                    min="1950"
                    [max]="currentYear"
                    placeholder="es. 2020">
                </div>
              </div>
            </div>

            <!-- Configurazione posti -->
            <div class="form-section">
              <h3>🪑 Configurazione Posti</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="business_class_seats">Posti Business Class *</label>
                  <input 
                    id="business_class_seats"
                    type="number" 
                    formControlName="business_class_seats"
                    min="0"
                    (input)="calculateTotalSeats()">
                  <div *ngIf="aircraftForm.get('business_class_seats')?.invalid && aircraftForm.get('business_class_seats')?.touched" 
                       class="error-message">Numero posti business obbligatorio</div>
                </div>

                <div class="form-group">
                  <label for="economy_class_seats">Posti Economy Class *</label>
                  <input 
                    id="economy_class_seats"
                    type="number" 
                    formControlName="economy_class_seats"
                    min="1"
                    (input)="calculateTotalSeats()">
                  <div *ngIf="aircraftForm.get('economy_class_seats')?.invalid && aircraftForm.get('economy_class_seats')?.touched" 
                       class="error-message">Numero posti economy obbligatorio</div>
                </div>

                <div class="form-group">
                  <label for="seat_capacity">Capacità Totale</label>
                  <input 
                    id="seat_capacity"
                    type="number" 
                    formControlName="seat_capacity"
                    readonly
                    class="readonly-field">
                  <small class="info-text">Calcolato automaticamente</small>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-cancel" (click)="closeModal()">
                Annulla
              </button>
              
              <!-- Bottone per eliminare definitivamente (solo in modifica) -->
              <button 
                type="button" 
                class="btn btn-delete-permanent" 
                (click)="confirmDeleteAircraft()"
                *ngIf="isEditing"
                style="background: #dc3545; color: white; margin-right: 10px;">
                🗑️ Elimina Definitivamente
              </button>
              
              <button type="submit" class="btn btn-save" [disabled]="aircraftForm.invalid || isLoading">
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
  styleUrl: './aircraft-admin.component.scss'
})
export class AircraftAdminComponent implements OnInit {
  aircrafts: Aircraft[] = [];
  filteredAircrafts: Aircraft[] = [];
  
  // Form e modal
  aircraftForm!: FormGroup;
  showModal = false;
  isEditing = false;
  editingAircraftId: number | null = null;
  isLoading = false;
  
  // Filtri
  statusFilter = '';
  typeFilter = '';
  searchTerm = '';
  
  // Autorizzazione
  canAccess = false;
  currentUser: any = null;
  isAdmin = false;
  isInitializing = true;
  
  // Anno corrente per validazione
  currentYear = new Date().getFullYear();

  constructor(
    private aircraftAdminService: AircraftAdminService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    // Aggiungi un piccolo delay per rendere il caricamento più fluido
    setTimeout(() => {
      this.checkAccess();
      this.aircraftForm = this.createAircraftForm();
      
      if (this.canAccess) {
        this.loadAircrafts();
      }
    }, 300);
  }

  private checkAccess(): void {
    const userStr = localStorage.getItem('user');
    this.currentUser = userStr ? JSON.parse(userStr) : null;
    this.isAdmin = this.currentUser?.role === 'admin';
    this.canAccess = this.currentUser?.role === 'airline' || this.isAdmin;
    this.isInitializing = false;
  }

  private createAircraftForm(): FormGroup {
    return this.fb.group({
      registration: ['', [Validators.required, Validators.pattern(/^[A-Z]{1,2}-[A-Z0-9]{4}$/)]],
      aircraft_type: ['', [Validators.required]],
      manufacturer: ['', [Validators.required]],
      model: ['', [Validators.required]],
      seat_capacity: [0],
      business_class_seats: [0, [Validators.required, Validators.min(0)]],
      economy_class_seats: [1, [Validators.required, Validators.min(1)]],
      manufacturing_year: [null]
    });
  }

  loadAircrafts() {
    this.isLoading = true;
    
    // Se è un admin, carica tutti gli aeromobili, altrimenti solo quelli della propria compagnia
    const aircraftObservable = this.isAdmin ? 
      this.aircraftAdminService.getAircrafts() : 
      this.aircraftAdminService.getMyAircrafts();
    
    aircraftObservable.subscribe({
      next: (aircrafts) => {
        this.aircrafts = aircrafts;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento degli aeromobili:', error);
        this.isLoading = false;
        alert('Errore nel caricamento degli aeromobili: ' + (error.error?.message || 'Errore sconosciuto'));
      }
    });
  }

  applyFilters() {
    this.filteredAircrafts = this.aircrafts.filter(aircraft => {
      const matchesStatus = !this.statusFilter || aircraft.status === this.statusFilter;
      const matchesType = !this.typeFilter || aircraft.aircraft_type === this.typeFilter;
      const matchesSearch = !this.searchTerm || 
        aircraft.registration.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        aircraft.model.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        aircraft.manufacturer.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesStatus && matchesType && matchesSearch;
    });
  }

  openCreateModal() {
    this.isEditing = false;
    this.editingAircraftId = null;
    this.aircraftForm.reset();
    this.aircraftForm.patchValue({ 
      business_class_seats: 0, 
      economy_class_seats: 1,
      seat_capacity: 1
    });
    this.showModal = true;
  }

  editAircraft(aircraft: Aircraft) {
    this.isEditing = true;
    this.editingAircraftId = aircraft.id;
    
    this.aircraftForm.patchValue({
      registration: aircraft.registration,
      aircraft_type: aircraft.aircraft_type,
      manufacturer: aircraft.manufacturer,
      model: aircraft.model,
      seat_capacity: aircraft.seat_capacity,
      business_class_seats: aircraft.business_class_seats,
      economy_class_seats: aircraft.economy_class_seats,
      manufacturing_year: aircraft.manufacturing_year
    });
    
    this.showModal = true;
  }

  saveAircraft() {
    if (this.aircraftForm.valid) {
      this.isLoading = true;
      const formData: AircraftFormData = this.aircraftForm.value;
      
      const operation = this.isEditing 
        ? this.aircraftAdminService.updateAircraft(this.editingAircraftId!, formData)
        : this.aircraftAdminService.createAircraft(formData);

      operation.subscribe({
        next: () => {
          this.closeModal();
          this.loadAircrafts();
          alert(`Aeromobile ${this.isEditing ? 'aggiornato' : 'creato'} con successo`);
        },
        error: (error) => {
          console.error('Errore nel salvataggio:', error);
          alert('Errore nel salvataggio: ' + (error.error?.message || 'Errore sconosciuto'));
          this.isLoading = false;
        }
      });
    } else {
      // Marca tutti i campi come touched per mostrare gli errori
      Object.keys(this.aircraftForm.controls).forEach(key => {
        this.aircraftForm.get(key)?.markAsTouched();
      });
    }
  }

  deleteAircraft(aircraft: Aircraft) {
    if (confirm(`Sei sicuro di voler eliminare l'aeromobile ${aircraft.registration}? Questa azione è irreversibile.`)) {
      this.isLoading = true;

      this.aircraftAdminService.deleteAircraft(aircraft.id).subscribe({
        next: () => {
          this.loadAircrafts();
          alert(`Aeromobile ${aircraft.registration} eliminato con successo`);
        },
        error: (error) => {
          console.error('Errore nell\'eliminazione:', error);
          alert('Errore nell\'eliminazione: ' + (error.error?.message || 'Errore sconosciuto'));
          this.isLoading = false;
        }
      });
    }
  }

  confirmDeleteAircraft() {
    if (!this.editingAircraftId) return;
    
    const aircraft = this.aircrafts.find(a => a.id === this.editingAircraftId);
    if (aircraft) {
      this.closeModal();
      this.deleteAircraft(aircraft);
    }
  }

  toggleMaintenanceStatus(aircraft: Aircraft) {
    const newStatus = aircraft.status === 'maintenance' ? 'active' : 'maintenance';
    const confirmMessage = newStatus === 'maintenance' 
      ? `Sei sicuro di voler mettere in manutenzione l'aeromobile ${aircraft.registration}?`
      : `Sei sicuro di voler riattivare l'aeromobile ${aircraft.registration}?`;
      
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      
      this.aircraftAdminService.updateAircraftStatus(aircraft.id, newStatus).subscribe({
        next: () => {
          this.loadAircrafts();
          alert(`Aeromobile ${aircraft.registration} ${newStatus === 'maintenance' ? 'messo in manutenzione' : 'riattivato'}`);
        },
        error: (error) => {
          console.error('Errore nell\'aggiornamento stato:', error);
          alert('Errore nell\'aggiornamento dello stato: ' + (error.error?.message || 'Errore sconosciuto'));
          this.isLoading = false;
        }
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.isEditing = false;
    this.editingAircraftId = null;
    this.aircraftForm.reset();
  }

  calculateTotalSeats() {
    const businessSeats = this.aircraftForm.get('business_class_seats')?.value || 0;
    const economySeats = this.aircraftForm.get('economy_class_seats')?.value || 0;
    const totalSeats = businessSeats + economySeats;
    
    this.aircraftForm.patchValue({ seat_capacity: totalSeats });
  }

  // Metodi di utilità
  trackByAircraftId(index: number, aircraft: Aircraft): number {
    return aircraft.id;
  }

  formatDate(dateString: Date | string | undefined): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch (error) {
      return '';
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'active': 'Attivo',
      'maintenance': 'In Manutenzione',
      'retired': 'Ritirato'
    };
    return labels[status] || status;
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'airline': 'Compagnia Aerea',
      'admin': 'Amministratore'
    };
    return labels[role] || role;
  }

  // Statistiche
  getActiveAircrafts(): number {
    return this.aircrafts.filter(a => a.status === 'active').length;
  }

  getMaintenanceAircrafts(): number {
    return this.aircrafts.filter(a => a.status === 'maintenance').length;
  }

  getTotalSeats(): number {
    return this.aircrafts.reduce((total, aircraft) => total + aircraft.seat_capacity, 0);
  }

  // Metodi per demo
  simulateAirlineLogin() {
    this.router.navigate(['/airline-login']);
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
