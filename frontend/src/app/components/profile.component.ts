import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  airline_name?: string;
  role: string;
  created_at?: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  profile_image_url?: string;
  // Campi per compagnie aeree
  iata_code?: string;
  country?: string;
  website?: string;
  founded_year?: number;
}

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <div class="profile-header">
        <div class="header-content">
          <div class="user-avatar" 
               (dblclick)="toggleAvatarMode()" 
               (mouseenter)="onAvatarHover()"
               title="Doppio click per gestire foto profilo">
            <img 
              *ngIf="currentUser?.profile_image_url" 
              [src]="currentUser?.profile_image_url" 
              [alt]="getUserFullName()"
              class="avatar-img"
              (error)="onImageError($event)"
            />
            <span 
              *ngIf="!currentUser?.profile_image_url" 
              class="avatar-text">{{ getUserInitials() }}</span>
            <div class="avatar-overlay" *ngIf="showAvatarHint">
              <span>� Doppio click</span>
            </div>
          </div>
          <div class="user-info">
            <h1>{{ getUserFullName() }}</h1>
            <p class="user-email">{{ currentUser?.email }}</p>
            <span class="user-role">{{ getRoleDisplayName() }}</span>
          </div>
        </div>
      </div>

      <div class="profile-content">
        <div class="profile-sections">
          <!-- Tabs Navigation -->
          <div class="tabs-nav">
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'avatar'"
              (click)="switchTab('avatar')"
              *ngIf="avatarModeEnabled">
              📷 Foto Profilo
            </button>
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'personal'"
              (click)="switchTab('personal')">
              👤 Informazioni {{ getUserType() }}
            </button>
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'security'"
              (click)="switchTab('security')">
              🔒 Sicurezza
            </button>
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'preferences'"
              (click)="switchTab('preferences')">
              ⚙️ Preferenze
            </button>
          </div>

          <!-- Avatar Tab -->
          <div *ngIf="activeTab === 'avatar' && avatarModeEnabled" class="tab-content">
            <div class="section-card">
              <h2>Gestione Foto Profilo</h2>
              <div class="avatar-section">
                <div class="current-avatar">
                  <img 
                    *ngIf="currentUser?.profile_image_url" 
                    [src]="currentUser?.profile_image_url" 
                    [alt]="getUserFullName()"
                    class="large-avatar"
                    (error)="onImageError($event)"
                  />
                  <div 
                    *ngIf="!currentUser?.profile_image_url" 
                    class="large-avatar avatar-placeholder">
                    <span class="large-avatar-text">{{ getUserInitials() }}</span>
                  </div>
                </div>
                
                <form [formGroup]="avatarForm" (ngSubmit)="updateAvatar()">
                  <div class="form-group">
                    <label for="imageUrl">URL Immagine Profilo</label>
                    <input 
                      type="url" 
                      id="imageUrl"
                      formControlName="imageUrl"
                      placeholder="https://esempio.com/immagine.jpg"
                      [class.error]="avatarForm.get('imageUrl')?.invalid && avatarForm.get('imageUrl')?.touched">
                    <div class="form-help">
                      Inserisci l'URL di un'immagine (jpg, jpeg, png, gif, webp)
                    </div>
                    <div *ngIf="avatarForm.get('imageUrl')?.invalid && avatarForm.get('imageUrl')?.touched" class="error-message">
                      Inserisci un URL valido per l'immagine
                    </div>
                  </div>
                  
                  <div class="form-actions">
                    <button type="submit" class="btn btn-primary" [disabled]="avatarForm.invalid || isLoading">
                      <span *ngIf="isLoading">Caricamento...</span>
                      <span *ngIf="!isLoading">💾 Aggiorna Foto</span>
                    </button>
                    <button type="button" class="btn btn-secondary" (click)="removeAvatar()" *ngIf="currentUser?.profile_image_url">
                      🗑️ Rimuovi Foto
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <!-- Personal Information Tab -->
          <div *ngIf="activeTab === 'personal'" class="tab-content">
            <div class="section-card">
              <h2>Informazioni {{ getUserType() }}</h2>
              <form [formGroup]="profileForm" (ngSubmit)="updateProfile()">
                <div class="form-grid">
                  <div class="form-group">
                    <label for="firstName">Nome</label>
                    <input 
                      type="text" 
                      id="firstName"
                      formControlName="firstName"
                      [class.error]="profileForm.get('firstName')?.invalid && profileForm.get('firstName')?.touched">
                    <div *ngIf="profileForm.get('firstName')?.invalid && profileForm.get('firstName')?.touched" class="error-message">
                      Il nome è obbligatorio
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="lastName">Cognome</label>
                    <input 
                      type="text" 
                      id="lastName"
                      formControlName="lastName"
                      [class.error]="profileForm.get('lastName')?.invalid && profileForm.get('lastName')?.touched">
                    <div *ngIf="profileForm.get('lastName')?.invalid && profileForm.get('lastName')?.touched" class="error-message">
                      Il cognome è obbligatorio
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="email">Email</label>
                    <input 
                      type="email" 
                      id="email"
                      formControlName="email"
                      [class.error]="profileForm.get('email')?.invalid && profileForm.get('email')?.touched">
                    <div *ngIf="profileForm.get('email')?.invalid && profileForm.get('email')?.touched" class="error-message">
                      Inserisci un'email valida
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="phone">Telefono</label>
                    <input 
                      type="tel" 
                      id="phone"
                      formControlName="phone"
                      placeholder="+39 123 456 7890">
                  </div>

                  <div class="form-group">
                    <label for="dateOfBirth">Data di Nascita</label>
                    <input 
                      type="date" 
                      id="dateOfBirth"
                      formControlName="dateOfBirth">
                  </div>

                  <div class="form-group">
                    <label for="nationality">Nazionalità</label>
                    <select formControlName="nationality">
                      <option value="">Seleziona nazionalità</option>
                      <option value="IT">Italia</option>
                      <option value="US">Stati Uniti</option>
                      <option value="GB">Regno Unito</option>
                      <option value="FR">Francia</option>
                      <option value="DE">Germania</option>
                      <option value="ES">Spagna</option>
                      <option value="OTHER">Altro</option>
                    </select>
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit" 
                          class="btn btn-primary" 
                          [disabled]="profileForm.invalid || isLoading">
                    <span *ngIf="isLoading">🔄 Salvando...</span>
                    <span *ngIf="!isLoading">💾 Salva Modifiche</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Security Tab -->
          <div *ngIf="activeTab === 'security'" class="tab-content">
            <div class="section-card">
              <h2>Cambia Password</h2>
              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
                <div class="form-group">
                  <label for="currentPassword">Password Attuale</label>
                  <input 
                    type="password" 
                    id="currentPassword"
                    formControlName="currentPassword"
                    [class.error]="passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched">
                  <div *ngIf="passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched" class="error-message">
                    La password attuale è obbligatoria
                  </div>
                </div>

                <div class="form-group">
                  <label for="newPassword">Nuova Password</label>
                  <input 
                    type="password" 
                    id="newPassword"
                    formControlName="newPassword"
                    [class.error]="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched">
                  <div *ngIf="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched" class="error-message">
                    La password deve essere lunga almeno 6 caratteri
                  </div>
                </div>

                <div class="form-group">
                  <label for="confirmPassword">Conferma Nuova Password</label>
                  <input 
                    type="password" 
                    id="confirmPassword"
                    formControlName="confirmPassword"
                    [class.error]="passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched">
                  <div *ngIf="passwordForm.get('confirmPassword')?.invalid && passwordForm.get('confirmPassword')?.touched" class="error-message">
                    Le password non corrispondono
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit" 
                          class="btn btn-secondary" 
                          [disabled]="passwordForm.invalid || isPasswordLoading">
                    <span *ngIf="isPasswordLoading">🔄 Aggiornando...</span>
                    <span *ngIf="!isPasswordLoading">🔒 Cambia Password</span>
                  </button>
                </div>
              </form>
            </div>

            <div class="section-card">
              <h2>Informazioni Account</h2>
              <div class="info-grid">
                <div class="info-item">
                  <label>Data Registrazione</label>
                  <span>{{ formatDate(currentUser?.created_at) }}</span>
                </div>
                <div class="info-item">
                  <label>Ultimo Accesso</label>
                  <span>{{ getLastLoginDisplay() }}</span>
                </div>
                <div class="info-item">
                  <label>Ruolo Account</label>
                  <span class="role-badge">{{ getRoleDisplayName() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Preferences Tab -->
          <div *ngIf="activeTab === 'preferences'" class="tab-content">
            <div class="section-card">
              <h2>Preferenze Generali</h2>
              <form [formGroup]="preferencesForm" (ngSubmit)="updatePreferences()">
                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="emailNotifications">
                    <span class="checkmark"></span>
                    Ricevi notifiche email
                  </label>
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="promotionalEmails">
                    <span class="checkmark"></span>
                    Ricevi email promozionali
                  </label>
                </div>

                <div class="form-group">
                  <label for="language">Lingua Preferita</label>
                  <select formControlName="language">
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="currency">Valuta Preferita</label>
                  <select formControlName="currency">
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GBP">British Pound (£)</option>
                  </select>
                </div>

                <div class="form-actions">
                  <button type="submit" 
                          class="btn btn-primary" 
                          [disabled]="preferencesForm.invalid || isPreferencesLoading">
                    <span *ngIf="isPreferencesLoading">🔄 Salvando...</span>
                    <span *ngIf="!isPreferencesLoading">💾 Salva Preferenze</span>
                  </button>
                </div>
              </form>
            </div>

            <div class="section-card danger-zone">
              <h2>Zona Pericolosa</h2>
              <p>Le azioni seguenti sono irreversibili. Procedi con cautela.</p>
              <div class="danger-actions">
                <button class="btn btn-danger" (click)="confirmDeleteAccount()">
                  🗑️ Elimina Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div *ngIf="message" class="message" [class.success]="messageType === 'success'" [class.error]="messageType === 'error'">
        {{ message }}
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }

    .profile-header {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 2rem;
      color: white;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .user-avatar {
      position: relative;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: bold;
      color: white;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .user-avatar:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      border: 2px solid rgba(78, 205, 196, 0.6);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .avatar-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      border-radius: 50%;
      color: white;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .user-avatar:hover .avatar-overlay {
      opacity: 1;
    }

    .user-info h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .user-email {
      margin: 0 0 0.5rem 0;
      opacity: 0.8;
      font-size: 1.1rem;
    }

    .user-role {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .profile-content {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      overflow: hidden;
    }

    .tabs-nav {
      display: flex;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tab-btn {
      flex: 1;
      padding: 1rem;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      border-bottom: 3px solid transparent;
    }

    .tab-btn:hover {
      color: white;
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
      color: white;
      background: rgba(255, 255, 255, 0.1);
      border-bottom-color: #4ecdc4;
    }

    .tab-content {
      padding: 2rem;
    }

    .section-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .section-card h2 {
      color: #333;
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .large-avatar {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      margin: 0 auto 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 4px solid rgba(78, 205, 196, 0.2);
    }

    .avatar-placeholder {
      background: linear-gradient(45deg, #4ecdc4, #44a08d);
      color: white;
    }

    .large-avatar-text {
      font-size: 3rem;
      font-weight: bold;
    }

    .avatar-section {
      text-align: center;
      max-width: 500px;
      margin: 0 auto;
    }

    .current-avatar {
      margin-bottom: 2rem;
    }

    .form-help {
      font-size: 0.85rem;
      color: #6c757d;
      margin-top: 0.25rem;
    }

    .help-message {
      background: linear-gradient(135deg, rgba(78, 205, 196, 0.1), rgba(68, 160, 141, 0.1));
      border: 1px solid rgba(78, 205, 196, 0.3);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .help-message p {
      margin: 0;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .help-message strong {
      color: #4ecdc4;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #333;
      font-weight: 500;
    }

    .form-group input,
    .form-group select {
      width: 100%;
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

    .form-group input.error {
      border-color: #ff6b6b;
    }

    .error-message {
      color: #ff6b6b;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
    }

    .info-grid {
      display: grid;
      gap: 1rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .info-item:last-child {
      border-bottom: none;
    }

    .info-item label {
      font-weight: 500;
      color: #666;
    }

    .role-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .form-actions {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f0f0f0;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(45deg, #4ecdc4, #44a08d);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(78, 205, 196, 0.3);
    }

    .btn-secondary {
      background: linear-gradient(45deg, #667eea, #764ba2);
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .btn-danger {
      background: linear-gradient(45deg, #ff6b6b, #ee5a52);
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);
    }

    .danger-zone {
      border: 2px solid #ff6b6b;
      background: #fff5f5;
    }

    .danger-zone h2 {
      color: #d32f2f;
    }

    .danger-zone p {
      color: #666;
      margin-bottom: 1rem;
    }

    .message {
      position: fixed;
      top: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }

    .message.success {
      background: linear-gradient(45deg, #4caf50, #45a049);
    }

    .message.error {
      background: linear-gradient(45deg, #f44336, #d32f2f);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .profile-container {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .user-avatar {
        width: 60px;
        height: 60px;
        font-size: 1.5rem;
      }

      .user-info h1 {
        font-size: 1.5rem;
      }

      .tabs-nav {
        flex-direction: column;
      }

      .tab-content {
        padding: 1rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .message {
        top: 1rem;
        right: 1rem;
        left: 1rem;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  activeTab: 'avatar' | 'personal' | 'security' | 'preferences' = 'personal';
  currentUser: User | null = null;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  preferencesForm!: FormGroup;
  avatarForm!: FormGroup;
  
  isLoading = false;
  isPasswordLoading = false;
  isPreferencesLoading = false;
  
  // Variabili per la funzionalità nascosta
  avatarModeEnabled = false;
  showAvatarHint = false;
  private clickCount = 0;
  private clickTimer: any;
  private secretSequence: string[] = [];
  private targetSequence = ['p', 'h', 'o', 't', 'o']; // Sequenza segreta: "photo"
  
  message = '';
  messageType: 'success' | 'error' = 'success';

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.loadUserProfile();
    this.setupSecretKeyListener();
  }

  private initializeForms() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      dateOfBirth: [''],
      nationality: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.preferencesForm = this.fb.group({
      emailNotifications: [true],
      promotionalEmails: [false],
      language: ['it'],
      currency: ['EUR']
    });

    this.avatarForm = this.fb.group({
      imageUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)]]
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  private loadCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.router.navigate(['/login']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  private loadUserProfile() {
    if (!this.currentUser) return;

    // Popola il form con i dati correnti dell'utente
    this.profileForm.patchValue({
      firstName: this.currentUser.first_name || '',
      lastName: this.currentUser.last_name || '',
      email: this.currentUser.email || '',
      phone: this.currentUser.phone || '',
      dateOfBirth: this.currentUser.date_of_birth || '',
      nationality: this.currentUser.nationality || ''
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  switchTab(tab: 'avatar' | 'personal' | 'security' | 'preferences') {
    this.activeTab = tab;
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const firstName = this.currentUser.first_name || '';
    const lastName = this.currentUser.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  getUserFullName(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.first_name || ''} ${this.currentUser.last_name || ''}`.trim();
  }

  // Metodi per la funzionalità nascosta
  setupSecretKeyListener(): void {
    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.secretSequence.push(key);
      
      // Mantieni solo gli ultimi 5 caratteri
      if (this.secretSequence.length > this.targetSequence.length) {
        this.secretSequence.shift();
      }
      
      // Controlla se la sequenza corrisponde
      if (this.secretSequence.join('') === this.targetSequence.join('')) {
        this.activateSecretPhotoMode();
        this.secretSequence = []; // Reset
      }
      
      // Reset dopo 3 secondi di inattività
      setTimeout(() => {
        if (this.secretSequence.length > 0) {
          this.secretSequence = [];
        }
      }, 3000);
    });
  }

  activateSecretPhotoMode(): void {
    this.avatarModeEnabled = true;
    this.activeTab = 'avatar';
    this.showMessage('🎯 Modalità foto profilo segreta attivata! (Digitando "photo")', 'success');
    
    // Disattiva automaticamente dopo 10 minuti
    setTimeout(() => {
      if (this.avatarModeEnabled) {
        this.avatarModeEnabled = false;
        this.activeTab = 'personal';
        this.showMessage('🔒 Modalità segreta disattivata automaticamente', 'error');
      }
    }, 600000); // 10 minuti
  }

  toggleAvatarMode(): void {
    this.avatarModeEnabled = !this.avatarModeEnabled;
    
    if (this.avatarModeEnabled) {
      this.activeTab = 'avatar';
      this.showMessage('🔓 Modalità modifica foto profilo attivata', 'success');
      
      // Disattiva automaticamente dopo 5 minuti per sicurezza
      setTimeout(() => {
        if (this.avatarModeEnabled) {
          this.avatarModeEnabled = false;
          this.activeTab = 'personal';
          this.showMessage('🔒 Modalità modifica foto profilo disattivata automaticamente', 'error');
        }
      }, 300000); // 5 minuti
    } else {
      this.activeTab = 'personal';
      this.showMessage('🔒 Modalità modifica foto profilo disattivata', 'error');
    }
    
    this.showAvatarHint = false;
  }

  // Mostra hint quando si passa il mouse sopra l'avatar
  onAvatarHover(): void {
    if (!this.avatarModeEnabled) {
      this.showAvatarHint = true;
      setTimeout(() => {
        this.showAvatarHint = false;
      }, 2000);
    }
  }

  getRoleDisplayName(): string {
    switch (this.currentUser?.role) {
      case 'admin': return 'Amministratore';
      case 'airline': return 'Compagnia Aerea';
      case 'user': return 'Utente';
      default: return 'Sconosciuto';
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Non disponibile';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return 'Data non valida';
    }
  }

  getLastLoginDisplay(): string {
    // Per ora mostra la data corrente, in futuro si può implementare il tracking
    return new Date().toLocaleDateString('it-IT');
  }

  updateProfile() {
    if (this.profileForm.invalid || !this.currentUser) return;

    this.isLoading = true;
    const formData = this.profileForm.value;

    const updateData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      date_of_birth: formData.dateOfBirth,
      nationality: formData.nationality
    };

    this.http.put(`${this.apiUrl}/users/profile`, updateData, { 
      headers: this.getAuthHeaders() 
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        // Aggiorna i dati locali dell'utente
        const updatedUser = { 
          ...this.currentUser!, 
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          email: updateData.email,
          phone: updateData.phone,
          date_of_birth: updateData.date_of_birth,
          nationality: updateData.nationality
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.currentUser = updatedUser;
        
        // Emetti evento per aggiornare la UI globale
        window.dispatchEvent(new CustomEvent('auth-changed'));
        
        this.showMessage('Profilo aggiornato con successo!', 'success');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error updating profile:', error);
        this.showMessage('Errore durante l\'aggiornamento del profilo', 'error');
      }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;

    this.isPasswordLoading = true;
    const formData = this.passwordForm.value;

    const passwordData: PasswordChangeRequest = {
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword
    };

    this.http.put(`${this.apiUrl}/users/change-password`, passwordData, { 
      headers: this.getAuthHeaders() 
    }).subscribe({
      next: (response) => {
        this.isPasswordLoading = false;
        this.passwordForm.reset();
        this.showMessage('Password cambiata con successo!', 'success');
      },
      error: (error) => {
        this.isPasswordLoading = false;
        console.error('Error changing password:', error);
        const errorMessage = error.error?.message || 'Errore durante il cambio password';
        this.showMessage(errorMessage, 'error');
      }
    });
  }

  updatePreferences() {
    this.isPreferencesLoading = true;
    const formData = this.preferencesForm.value;

    // Per ora salva in localStorage, in futuro si può implementare API dedicata
    localStorage.setItem('userPreferences', JSON.stringify(formData));
    
    setTimeout(() => {
      this.isPreferencesLoading = false;
      this.showMessage('Preferenze salvate con successo!', 'success');
    }, 1000);
  }

  confirmDeleteAccount() {
    const confirmed = confirm(
      'Sei sicuro di voler eliminare il tuo account? ' +
      'Questa azione è irreversibile e tutti i tuoi dati saranno persi.'
    );

    if (confirmed) {
      this.deleteAccount();
    }
  }

  private deleteAccount() {
    this.http.delete(`${this.apiUrl}/users/account`, { 
      headers: this.getAuthHeaders() 
    }).subscribe({
      next: (response) => {
        this.showMessage('Account eliminato con successo', 'success');
        setTimeout(() => {
          localStorage.clear();
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error deleting account:', error);
        this.showMessage('Errore durante l\'eliminazione dell\'account', 'error');
      }
    });
  }

  private showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageType = type;
    
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  // Nuovi metodi per gestione avatar e tipi utente
  updateAvatar() {
    if (this.avatarForm.invalid) return;

    this.isLoading = true;
    const imageUrl = this.avatarForm.get('imageUrl')?.value;

    this.http.put(`${this.apiUrl}/users/profile-image`, 
      { profile_image_url: imageUrl },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        // Aggiorna i dati locali dell'utente
        const updatedUser = { 
          ...this.currentUser!, 
          profile_image_url: imageUrl
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.currentUser = updatedUser;
        
        this.avatarForm.reset();
        this.showMessage('Foto profilo aggiornata con successo!', 'success');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error updating avatar:', error);
        this.showMessage('Errore durante l\'aggiornamento della foto', 'error');
      }
    });
  }

  removeAvatar() {
    this.isLoading = true;

    this.http.put(`${this.apiUrl}/users/profile-image`, 
      { profile_image_url: null },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        // Aggiorna i dati locali dell'utente
        const updatedUser = { 
          ...this.currentUser!
        };
        delete updatedUser.profile_image_url;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        this.currentUser = updatedUser;
        
        this.showMessage('Foto profilo rimossa con successo!', 'success');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error removing avatar:', error);
        this.showMessage('Errore durante la rimozione della foto', 'error');
      }
    });
  }

  onImageError(event: any) {
    event.target.style.display = 'none';
    // Mostra l'avatar con iniziali come fallback
  }

  getUserType(): string {
    if (this.currentUser?.role === 'airline') {
      return 'Compagnia Aerea';
    } else if (this.currentUser?.role === 'admin') {
      return 'Amministratore';
    }
    return 'Personali';
  }

}
