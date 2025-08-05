import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-user-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="register-container">
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="success">{{ successMessage }}</div>
      <div class="register-card">
        <h2>📝 Crea un nuovo account</h2>
        <form (ngSubmit)="onRegister()" #registerForm="ngForm">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Nome</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                [(ngModel)]="registerData.firstName"
                required
                class="form-control"
                placeholder="Il tuo nome">
            </div>

            <div class="form-group">
              <label for="lastName">Cognome</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                [(ngModel)]="registerData.lastName"
                required
                class="form-control"
                placeholder="Il tuo cognome">
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="registerData.email"
              required
              class="form-control"
              placeholder="Inserisci la tua email">
          </div>

          <div class="form-group">
            <label for="phone">Telefono</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              [(ngModel)]="registerData.phone"
              required
              class="form-control"
              placeholder="Il tuo numero di telefono">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="registerData.password"
              required
              minlength="6"
              class="form-control"
              placeholder="Crea una password sicura">
          </div>

          <div class="form-group">
            <label for="confirmPassword">Conferma Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              [(ngModel)]="registerData.confirmPassword"
              required
              class="form-control"
              placeholder="Ripeti la password">
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                name="acceptTerms"
                [(ngModel)]="registerData.acceptTerms"
                required>
              Accetto i <a href="#" target="_blank">termini e condizioni</a>
            </label>
          </div>

          <button
            type="submit"
            class="btn-primary"
            [disabled]="!registerForm.valid || isLoading || !passwordsMatch()">
            {{ isLoading ? 'Registrazione in corso...' : 'Registrati' }}
          </button>

          <div class="register-footer">
            <p>Hai già un account? <a routerLink="/login">Accedi qui</a></p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 70vh;
      padding: 20px;
    }

    .register-card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 500px;
    }

    h2 {
      text-align: center;
      margin-bottom: 30px;
      color: #1976d2;
      font-size: 1.5rem;
    }

    .form-row {
      display: flex;
      gap: 15px;
    }

    .form-group {
      margin-bottom: 20px;
      flex: 1;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
      transition: border-color 0.3s;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #1976d2;
    }

    .checkbox-group {
      margin-bottom: 25px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .checkbox-label a {
      color: #1976d2;
      text-decoration: none;
    }

    .checkbox-label a:hover {
      text-decoration: underline;
    }

    .btn-primary {
      width: 100%;
      background: #1976d2;
      color: white;
      padding: 12px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1565c0;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .register-footer {
      text-align: center;
      margin-top: 20px;
    }

    .register-footer a {
      color: #1976d2;
      text-decoration: none;
    }

    .register-footer a:hover {
      text-decoration: underline;
    }

    .error {
      color: red;
      margin-bottom: 20px;
      text-align: center;
    }

    .success {
      color: green;
      margin-bottom: 20px;
      text-align: center;
    }
  `]
})

export class UserRegisterComponent {
  registerData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  };

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  passwordsMatch(): boolean {
    return this.registerData.password === this.registerData.confirmPassword;
  }

  onRegister() {
    if (!this.passwordsMatch()) {
      alert('Le password non corrispondono!');
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.http.post(`${environment.apiUrl}/users/register`, {
      email: this.registerData.email,
      password: this.registerData.password,
      first_name: this.registerData.firstName,
      last_name: this.registerData.lastName,
      phone: this.registerData.phone,
      role : 'user'
    }).subscribe({
      next: res => {
        console.debug('[DEBUG] Registration success', res);
        this.isLoading = false;
        this.successMessage = 'Registrazione completata con successo!';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: HttpErrorResponse) => {
        console.error('[ERROR] Registration error', err);
        this.errorMessage = err.error?.error || 'Errore durante la registrazione';
        this.isLoading = false;
      }
    });
  }
}
