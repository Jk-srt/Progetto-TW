import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="admin-login-container">
      <div class="admin-login-card">
        <div class="admin-header">
          <h2>🔐 Accesso Amministratore</h2>
          <p>Sistema di gestione compagnie aeree</p>
        </div>

        <form (ngSubmit)="onLogin()" #loginForm="ngForm" class="admin-form">
          <div class="form-group">
            <label for="email">Email Amministratore</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              required
              class="form-control"
              placeholder="admin@example.com"
              [class.error]="errorMessage"
            >
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="password"
              required
              class="form-control"
              placeholder="Password amministratore"
              [class.error]="errorMessage"
            >
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button 
            type="submit" 
            class="admin-login-btn"
            [disabled]="isLoading || !loginForm.form.valid"
          >
            <span *ngIf="isLoading" class="loading-spinner"></span>
            {{ isLoading ? 'Accesso in corso...' : '🔑 Accedi come Admin' }}
          </button>
        </form>

        <div class="admin-info">
          <div class="info-box">
            <h4>ℹ️ Informazioni Accesso</h4>
            <p><strong>Email:</strong> admin@example.com</p>
            <p><strong>Ruolo:</strong> Amministratore Sistema</p>
            <p><strong>Permessi:</strong> Gestione completa compagnie aeree</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
      padding: 2rem;
    }

    .admin-login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      padding: 3rem;
      width: 100%;
      max-width: 450px;
      animation: slideIn 0.5s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .admin-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .admin-header h2 {
      color: #2c3e50;
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .admin-header p {
      color: #7f8c8d;
      font-size: 0.95rem;
      margin: 0;
    }

    .admin-form {
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #2c3e50;
      font-size: 0.9rem;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e8ed;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: #f8f9fa;
    }

    .form-control:focus {
      outline: none;
      border-color: #3498db;
      background: white;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .form-control.error {
      border-color: #e74c3c;
      background: #fdf2f2;
    }

    .error-message {
      background: #fdf2f2;
      color: #e74c3c;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
      margin-bottom: 1rem;
      border: 1px solid #f5c6cb;
    }

    .admin-login-btn {
      width: 100%;
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .admin-login-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #c0392b, #a93226);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(231, 76, 60, 0.3);
    }

    .admin-login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .admin-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1rem;
    }

    .info-box h4 {
      color: #2c3e50;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }

    .info-box p {
      color: #5a6c7d;
      font-size: 0.8rem;
      margin-bottom: 0.25rem;
      line-height: 1.4;
    }

    .info-box p:last-child {
      margin-bottom: 0;
    }

    @media (max-width: 480px) {
      .admin-login-container {
        padding: 1rem;
      }

      .admin-login-card {
        padding: 2rem;
      }

      .admin-header h2 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class AdminLoginComponent {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  onLogin() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    const loginData = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>('http://localhost:3000/api/auth/admin/login', loginData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            // Store token and user data
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            // Dispatch auth change event
            window.dispatchEvent(new Event('auth-changed'));
            
            console.log('Admin login successful:', response);
            this.router.navigate(['/admin']);
          } else {
            this.errorMessage = response.message || 'Errore durante il login';
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = 'Credenziali non valide o errore di connessione';
          console.error('Admin login error:', error);
        }
      });
  }
}
