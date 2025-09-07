import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <h1>Impostazioni</h1>
        <p>Gestisci le tue preferenze</p>
      </div>
      
      <div class="settings-content">
        <div class="settings-card" *ngIf="forcePasswordChange">
          <h2>Cambio password obbligatorio</h2>
          <div class="settings-section">
            <p style="color:#b71c1c; font-weight:600;">Per continuare devi impostare una nuova password.</p>
            <div class="form-group">
              <label>Nuova password</label>
              <input type="password" [(ngModel)]="newPassword" class="pw-input" />
            </div>
            <div class="form-group">
              <label>Conferma password</label>
              <input type="password" [(ngModel)]="confirmPassword" class="pw-input" />
            </div>
            <button class="action-button primary" (click)="submitForcedPassword()" [disabled]="isChangingPassword || !canSubmitPassword()">
              {{ isChangingPassword ? 'Salvataggio...' : 'Salva nuova password' }}
            </button>
          </div>
        </div>

        <!-- Card Configurazione account rimossa perché non necessaria -->
        
        <!-- Sezione Gestione Flotta (solo per compagnie aeree) -->
        <div class="settings-card" *ngIf="isAirlineUser()">
          <h2>Gestione Flotta</h2>
          <div class="settings-section">
            <p>Gestisci gli aeromobili della tua compagnia aerea</p>
            <div class="fleet-actions">
              <button class="action-button primary" (click)="navigateToAircraftAdmin()" *ngIf="isAirlineUser()">
                ✈️ Gestisci Aeromobili
              </button>
              <button class="action-button secondary" (click)="viewFleetStats()" *ngIf="isAirlineUser()">
                📊 Statistiche Flotta
              </button>
            </div>
          </div>
        </div>
        
        <div class="settings-card">
          <h2>Privacy e sicurezza</h2>
          <div class="settings-section">
            <button *ngIf="isPassengerUser()" class="action-button danger" (click)="confirmDeleteAccount()" [disabled]="isDeleting">
              {{ isDeleting ? 'Eliminazione...' : 'Elimina account' }}
            </button>
            <div *ngIf="!isPassengerUser()" class="info-text" style="font-size:0.85rem;color:#666;">
              Eliminazione disponibile solo per account passeggero.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .settings-header {
      text-align: center;
      margin-bottom: 3rem;
      color: white;
    }

    .settings-header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .settings-header p {
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .settings-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .settings-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .settings-card h2 {
      color: #333;
      margin-bottom: 1.5rem;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-info h3 {
      color: #333;
      margin-bottom: 0.25rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .setting-info p {
      color: #666;
      font-size: 0.9rem;
      margin: 0;
    }

    .toggle {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #667eea;
    }

    input:checked + .slider:before {
      transform: translateX(26px);
    }

    .action-button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 150px;
      text-align: left;
    }

    .action-button.secondary {
      background: #f8f9fa;
      color: #333;
      border: 1px solid #e9ecef;
    }

    .action-button.secondary:hover {
      background: #e9ecef;
    }

    .action-button.danger {
      background: #fff5f5;
      color: #dc3545;
      border: 1px solid #f5c6cb;
    }

    .action-button.danger:hover {
      background: #f8d7da;
    }

    .fleet-actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .action-button.primary {
      background: linear-gradient(45deg, #4ecdc4, #44a08d);
      color: white;
      border: 1px solid transparent;
    }

    .action-button.primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(78, 205, 196, 0.3);
    }

    .action-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .aircraft-form {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 1rem;
    }

    .aircraft-form h3 {
      color: #333;
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      color: #333;
      margin-bottom: 0.5rem;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .form-group input,
    .form-group select {
      padding: 0.75rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #4ecdc4;
      box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
    }

    .form-group input.error,
    .form-group select.error {
      border-color: #ff6b6b;
    }

    .error-message {
      color: #ff6b6b;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-start;
    }

    @media (max-width: 768px) {
      .settings-header h1 {
        font-size: 2rem;
      }
      
      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .toggle {
        align-self: flex-end;
      }

      .fleet-actions {
        flex-direction: column;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  title = 'Impostazioni';
  isDarkMode = false;
  showNotifications = true;
  autoSave = true;
  language = 'it';
  userRole: string | null = null;
  currentUser: any = null;
  isDeleting = false;
  forcePasswordChange = false;
  newPassword = '';
  confirmPassword = '';
  isChangingPassword = false;

  constructor(
    private router: Router,
  private http: HttpClient,
  private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get user role from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userRole = payload.role;
        this.currentUser = payload;
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
    // Controlla query param per cambio password forzato
    this.route.queryParamMap.subscribe(params => {
      if (params.get('forcePassword') === '1' && this.userRole === 'airline') {
        this.forcePasswordChange = true;
      }
    });
  }

  isAirlineUser(): boolean {
    return this.userRole === 'airline_admin' || this.userRole === 'airline';
  }

  navigateToAircraftAdmin() {
    this.router.navigate(['/aircraft-admin']);
  }

  viewFleetStats() {
    // TODO: Navigate to fleet statistics view or open modal
    console.log('Navigate to fleet statistics');
    alert('Funzionalità statistiche flotta in arrivo!');
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }

  isPassengerUser(): boolean {
    return this.userRole === 'user';
  }

  canSubmitPassword(): boolean {
    return this.newPassword.length >= 6 && this.newPassword === this.confirmPassword;
  }

  submitForcedPassword() {
    if (!this.canSubmitPassword() || this.isChangingPassword) return;
    this.isChangingPassword = true;
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Sessione scaduta, effettua di nuovo il login.');
      return;
    }
    this.http.post('/api/auth/force-change-password', {
      newPassword: this.newPassword
    }, { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }).subscribe({
      next: (res: any) => {
        this.isChangingPassword = false;
        this.forcePasswordChange = false;
        this.newPassword = '';
        this.confirmPassword = '';
        if (res.token) {
          localStorage.setItem('token', res.token);
          // Forza flag must_change_password a false nel dato utente salvato
          if (res.user) {
            res.user.must_change_password = false;
            localStorage.setItem('user', JSON.stringify(res.user));
          }
        }
        alert('Password aggiornata con successo');
      },
      error: err => {
        console.error('Errore cambio password forzato', err);
        alert(err?.error?.message || 'Errore aggiornamento password');
        this.isChangingPassword = false;
      }
    });
  }

  confirmDeleteAccount() {
    if (this.isDeleting) return;
    const proceed = confirm('Sei sicuro di voler eliminare definitivamente il tuo account? L\'operazione è irreversibile.');
    if (!proceed) return;
    this.deleteAccount();
  }

  private deleteAccount() {
    this.isDeleting = true;
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Token non trovato: effettua di nuovo l\'accesso.');
      this.isDeleting = false;
      return;
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  this.http.delete('/api/users/delete', { headers }).subscribe({
      next: (res: any) => {
        console.log('Account eliminato', res);
    // Pulisci tutto il localStorage rilevante
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    alert('Account eliminato con successo. Verrai reindirizzato al login.');
    this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Errore eliminazione account', err);
        alert(err?.error?.message || 'Errore durante eliminazione account');
        this.isDeleting = false;
      }
    });
  }
}
