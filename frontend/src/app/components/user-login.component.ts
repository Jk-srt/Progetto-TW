import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>🔐 Accedi al tuo account</h2>
        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="loginData.email"
              required
              class="form-control"
              placeholder="Inserisci la tua email">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="loginData.password"
              required
              class="form-control"
              placeholder="Inserisci la tua password">
          </div>

          <button
            type="submit"
            class="btn-primary"
            [disabled]="!loginForm.valid || isLoading">
            {{ isLoading ? 'Accesso in corso...' : 'Accedi' }}
          </button>

          <div class="login-footer">
            <p>Non hai un account? <a routerLink="/register">Registrati qui</a></p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 70vh;
      padding: 20px;
    }

    .login-card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }

    h2 {
      text-align: center;
      margin-bottom: 30px;
      color: #1976d2;
      font-size: 1.5rem;
    }

    .form-group {
      margin-bottom: 20px;
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
    }

    .form-control:focus {
      outline: none;
      border-color: #1976d2;
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

    .login-footer {
      text-align: center;
      margin-top: 20px;
    }

    .login-footer a {
      color: #1976d2;
      text-decoration: none;
    }

    .login-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class UserLoginComponent {
  loginData = {
    email: '',
    password: ''
  };

  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {}

  onLogin() {
    this.isLoading = true;
    this.errorMessage = null;

    // Mock login for regular users
    const mockUsers = [
      { email: 'user@example.com', password: 'password', name: 'Utente Demo' }
    ];

    const user = mockUsers.find(u => u.email === this.loginData.email && u.password === this.loginData.password);
    
    if (user) {
      localStorage.setItem('token', 'mock-user-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify({
        email: user.email,
        first_name: user.name.split(' ')[0],
        last_name: user.name.split(' ')[1] || '',
        role: 'user'
      }));
      
      this.isLoading = false;
      this.router.navigate(['/']);
      // Refresh the app to update auth state
      window.location.reload();
    } else {
      this.errorMessage = 'Credenziali non valide';
      this.isLoading = false;
    }
  }
}
