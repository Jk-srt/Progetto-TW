import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface Airline {
  id: number;
  name: string;
  iata_code: string;
  icao_code: string;
  country: string;
  founded_year?: number;
  website?: string;
  email?: string;
  has_credentials?: boolean;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="admin-panel">
      <div class="admin-header">
        <div class="header-content">
          <h1>👨‍💼 Pannello Amministratore</h1>
          <p>Gestione Compagnie Aeree - Sistema TAW Flights</p>
          <button (click)="logout()" class="logout-btn">🚪 Logout</button>
        </div>
      </div>

      <div class="admin-content">
        <!-- Add/Edit Form -->
        <div class="action-section">
          <div class="form-card">
            <h3>{{ editingAirline ? '✏️ Modifica Compagnia' : '➕ Nuova Compagnia Aerea' }}</h3>
            
            <form (ngSubmit)="saveAirline()" #airlineForm="ngForm" class="airline-form">
              <!-- Basic Info -->
              <div class="form-row">
                <div class="form-group">
                  <label for="name">Nome Compagnia</label>
                  <input type="text" id="name" name="name" [(ngModel)]="formData.name" 
                         required class="form-control" placeholder="es. Alitalia">
                </div>
                <div class="form-group">
                  <label for="iata_code">Codice IATA</label>
                  <input type="text" id="iata_code" name="iata_code" [(ngModel)]="formData.iata_code" 
                         required maxlength="2" class="form-control" placeholder="es. AZ">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="icao_code">Codice ICAO</label>
                  <input type="text" id="icao_code" name="icao_code" [(ngModel)]="formData.icao_code" 
                         required maxlength="3" class="form-control" placeholder="es. AZA">
                </div>
                <div class="form-group">
                  <label for="country">Paese</label>
                  <input type="text" id="country" name="country" [(ngModel)]="formData.country" 
                         required class="form-control" placeholder="es. Italy">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="founded_year">Anno Fondazione</label>
                  <input type="number" id="founded_year" name="founded_year" [(ngModel)]="formData.founded_year" 
                         class="form-control" placeholder="es. 1946">
                </div>
                <div class="form-group">
                  <label for="website">Sito Web</label>
                  <input type="url" id="website" name="website" [(ngModel)]="formData.website" 
                         class="form-control" placeholder="https://www.compagnia.com">
                </div>
              </div>

              <!-- � CREDENZIALI DI ACCESSO -->
              <div class="credentials-section">
                <h4>🔐 Credenziali di Accesso</h4>
                <p class="help-text">Imposta email e password per permettere alla compagnia di accedere al sistema</p>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="email">Email di Accesso</label>
                    <input type="email" id="email" name="email" [(ngModel)]="formData.email" 
                           class="form-control" placeholder="admin@compagnia.com">
                  </div>
                  <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" [(ngModel)]="formData.password" 
                           class="form-control" placeholder="Password per accesso compagnia">
                    <small class="help-text" *ngIf="editingAirline">Lascia vuoto per mantenere la password attuale</small>
                  </div>
                </div>
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                <button type="submit" class="save-btn" [disabled]="!airlineForm.form.valid || isLoading">
                  <span *ngIf="isLoading" class="loading-spinner"></span>
                  {{ editingAirline ? '💾 Aggiorna' : '➕ Aggiungi' }}
                </button>
                <button type="button" class="cancel-btn" (click)="cancelEdit()" *ngIf="editingAirline">
                  ❌ Annulla
                </button>
              </div>
            </form>

            <!-- Messages -->
            <div class="error-message" *ngIf="errorMessage">{{ errorMessage }}</div>
            <div class="success-message" *ngIf="successMessage">{{ successMessage }}</div>
          </div>
        </div>

        <!-- Airlines List -->
        <div class="list-section">
          <div class="airlines-card">
            <h3>✈️ Compagnie Aeree Registrate ({{ airlines.length }})</h3>
            
            <div class="airlines-grid" *ngIf="airlines.length > 0; else noAirlines">
              <div class="airline-item" *ngFor="let airline of airlines">
                <div class="airline-info">
                  <div class="airline-main">
                    <h4>{{ airline.name }}</h4>
                    <span class="iata-code">{{ airline.iata_code }}</span>
                  </div>
                  <div class="airline-details">
                    <p>🌍 {{ airline.country }}</p>
                    <p>✈️ {{ airline.iata_code }} / {{ airline.icao_code }}</p>
                    <p *ngIf="airline.founded_year">📅 Fondazione: {{ airline.founded_year }}</p>
                    <p *ngIf="airline.website">🌐 <a [href]="airline.website" target="_blank">{{ airline.website }}</a></p>
                    <p *ngIf="airline.email">📧 {{ airline.email }}</p>
                    <p class="credentials-status">
                      🔐 Accesso: 
                      <span [class]="airline.has_credentials ? 'status-active' : 'status-inactive'">
                        {{ airline.has_credentials ? 'Configurato' : 'Non configurato' }}
                      </span>
                    </p>
                  </div>
                </div>

                <div class="airline-actions">
                  <button (click)="editAirline(airline)" class="edit-btn">✏️ Modifica</button>
                  <button (click)="deleteAirline(airline)" class="delete-btn">🗑️ Elimina</button>
                </div>
              </div>
            </div>

            <ng-template #noAirlines>
              <div class="no-airlines">
                <p>📭 Nessuna compagnia aerea registrata</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-panel { min-height: 100vh; background: #f5f7fa; }
    .admin-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header-content { max-width: 1200px; margin: 0 auto; padding: 0 2rem; display: flex; justify-content: space-between; align-items: center; }
    .header-content h1 { margin: 0; font-size: 2.5rem; font-weight: 700; }
    .header-content p { margin: 0.5rem 0 0 0; opacity: 0.9; font-size: 1.1rem; }
    .logout-btn { background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.3); padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
    .logout-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.5); }
    .admin-content { max-width: 1200px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 1fr; gap: 2rem; }
    .form-card, .airlines-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .form-card h3, .airlines-card h3 { margin: 0 0 1.5rem 0; color: #2c3e50; font-size: 1.5rem; font-weight: 600; }
    .credentials-section { margin: 2rem 0; padding: 1.5rem; background: #f8f9fc; border-radius: 8px; border-left: 4px solid #3498db; }
    .credentials-section h4 { margin: 0 0 0.5rem 0; color: #2c3e50; font-size: 1.2rem; }
    .help-text { color: #6c757d; font-size: 0.9rem; margin: 0.5rem 0; }
    .airline-form { display: flex; flex-direction: column; gap: 1.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { font-weight: 600; color: #2c3e50; margin-bottom: 0.5rem; }
    .form-control { padding: 12px; border: 2px solid #e1e8ed; border-radius: 8px; font-size: 1rem; transition: all 0.3s ease; }
    .form-control:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1); }
    .form-actions { display: flex; gap: 1rem; margin-top: 1rem; }
    .save-btn { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 0.5rem; }
    .save-btn:hover:not(:disabled) { background: linear-gradient(135deg, #229954, #27ae60); transform: translateY(-2px); }
    .save-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .cancel-btn { background: #95a5a6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
    .cancel-btn:hover { background: #7f8c8d; }
    .loading-spinner { width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid #ffffff; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .airlines-grid { display: grid; gap: 1.5rem; }
    .airline-item { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; transition: all 0.3s ease; }
    .airline-item:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-color: #3498db; }
    .airline-info { flex: 1; }
    .airline-main { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .airline-main h4 { margin: 0; color: #2c3e50; font-size: 1.3rem; }
    .iata-code { background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.9rem; }
    .airline-details p { margin: 0.5rem 0; color: #5a6c7d; }
    .airline-details a { color: #3498db; text-decoration: none; }
    .airline-details a:hover { text-decoration: underline; }
    .credentials-status { font-weight: 600; }
    .status-active { color: #27ae60; }
    .status-inactive { color: #e74c3c; }
    .airline-actions { display: flex; flex-direction: column; gap: 0.5rem; }
    .edit-btn { background: #f39c12; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s ease; }
    .edit-btn:hover { background: #e67e22; }
    .delete-btn { background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s ease; }
    .delete-btn:hover { background: #c0392b; }
    .error-message { background: #fdf2f2; color: #e74c3c; padding: 1rem; border-radius: 8px; border-left: 4px solid #e74c3c; margin-top: 1rem; }
    .success-message { background: #f0f9ff; color: #27ae60; padding: 1rem; border-radius: 8px; border-left: 4px solid #27ae60; margin-top: 1rem; }
    .no-airlines { text-align: center; padding: 2rem; color: #6c757d; font-style: italic; }
    @media (max-width: 768px) {
      .header-content { flex-direction: column; text-align: center; gap: 1rem; }
      .admin-content { padding: 1rem; }
      .form-row { grid-template-columns: 1fr; }
      .airline-item { flex-direction: column; gap: 1rem; }
      .airline-actions { width: 100%; justify-content: flex-end; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  airlines: Airline[] = [];
  editingAirline: Airline | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  formData = {
    name: '',
    iata_code: '',
    icao_code: '',
    country: '',
    founded_year: undefined as number | undefined,
    website: '',
    email: '',
    password: ''
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.checkAdminAccess();
    this.loadAirlines();
  }

  private checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      this.router.navigate(['/']);
    }
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  loadAirlines() {
    this.http.get<any>('http://localhost:3000/api/auth/airlines', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.airlines = response.airlines;
        }
      },
      error: (error: any) => {
        console.error('Error loading airlines:', error);
        this.errorMessage = 'Errore nel caricamento delle compagnie aeree';
      }
    });
  }

  saveAirline() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const url = this.editingAirline 
      ? `http://localhost:3000/api/auth/airlines/${this.editingAirline.id}`
      : 'http://localhost:3000/api/auth/airlines';

    const request = this.editingAirline 
      ? this.http.put<any>(url, this.formData, { headers: this.getAuthHeaders() })
      : this.http.post<any>(url, this.formData, { headers: this.getAuthHeaders() });

    request.subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message;
          this.loadAirlines();
          this.resetForm();
          setTimeout(() => this.successMessage = '', 3000);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Errore durante il salvataggio';
      }
    });
  }

  editAirline(airline: Airline) {
    this.editingAirline = airline;
    this.formData = {
      name: airline.name,
      iata_code: airline.iata_code,
      icao_code: airline.icao_code,
      country: airline.country,
      founded_year: airline.founded_year,
      website: airline.website || '',
      email: airline.email || '',
      password: ''
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit() {
    this.editingAirline = null;
    this.resetForm();
  }

  deleteAirline(airline: Airline) {
    if (!confirm(`Sei sicuro di voler eliminare ${airline.name}?`)) {
      return;
    }

    this.http.delete<any>(`http://localhost:3000/api/auth/airlines/${airline.id}`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.successMessage = response.message;
          this.loadAirlines();
          setTimeout(() => this.successMessage = '', 3000);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error: any) => {
        this.errorMessage = error.error?.message || 'Errore durante l\'eliminazione';
      }
    });
  }

  resetForm() {
    this.formData = {
      name: '',
      iata_code: '',
      icao_code: '',
      country: '',
      founded_year: undefined,
      website: '',
      email: '',
      password: ''
    };
    this.editingAirline = null;
    this.errorMessage = '';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-changed'));
    this.router.navigate(['/']);
  }
}
