import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-airline-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="airline-login-container">
      <div class="login-form">
        <h2>🛫 Accesso Compagnie Aeree</h2>
        <p class="subtitle">Accedi per gestire i voli della tua compagnia</p>
        
        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              [(ngModel)]="email" 
              required 
              placeholder="Es: admin@alitalia.com"
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
              placeholder="Inserisci la password"
            >
          </div>
          
          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
          
          <button type="submit" [disabled]="isLoading" class="login-btn">
            <span *ngIf="!isLoading">Accedi</span>
            <span *ngIf="isLoading">Accesso in corso...</span>
          </button>
        </form>
        
        <div class="demo-section">
          <h3>🔧 Account Demo Disponibili</h3>
          <div class="demo-accounts">
            <div class="demo-card" *ngFor="let airline of demoAirlines" (click)="quickLogin(airline)">
              <h4>{{ airline.name }}</h4>
              <p>Email: {{ airline.email }}</p>
              <p>Password: {{ airline.password }}</p>
              <small>Clicca per accesso rapido</small>
            </div>
          </div>
        </div>
        
        <div class="back-link">
          <a routerLink="/flights">← Torna alla visualizzazione voli</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .airline-login-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .login-form {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      max-width: 500px;
      width: 100%;
    }

    h2 {
      text-align: center;
      color: #333;
      margin-bottom: 10px;
      font-size: 2rem;
    }

    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
    }

    .error-message {
      background: #fee;
      color: #c33;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 15px;
      border: 1px solid #fcc;
    }

    .login-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .login-btn:hover {
      transform: translateY(-2px);
    }

    .login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .demo-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #f0f0f0;
    }

    .demo-section h3 {
      color: #333;
      margin-bottom: 20px;
      text-align: center;
    }

    .demo-accounts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .demo-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 10px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
    }

    .demo-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
    }

    .demo-card h4 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .demo-card p {
      margin: 5px 0;
      font-size: 0.9rem;
      color: #666;
    }

    .demo-card small {
      color: #999;
      font-style: italic;
    }

    .back-link {
      text-align: center;
      margin-top: 30px;
    }

    .back-link a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .back-link a:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .login-form {
        padding: 20px;
        margin: 10px;
      }
      
      .demo-accounts {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AirlineLoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  demoAirlines = [
    { name: 'Alitalia', email: 'admin@alitalia.com', password: 'alitalia123' },
    { name: 'Lufthansa', email: 'admin@lufthansa.com', password: 'lufthansa123' },
    { name: 'Air France', email: 'admin@airfrance.com', password: 'airfrance123' },
    { name: 'Emirates', email: 'admin@emirates.com', password: 'emirates123' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Inserisci email e password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loginData = { email: this.email, password: this.password };

    this.http.post<any>('http://localhost:3000/api/auth/airline/login', loginData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          // Store token and user data
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          console.log('Login successful:', response);
          this.router.navigate(['/flight-admin']);
        } else {
          this.errorMessage = response.message || 'Errore durante il login';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = 'Errore di connessione al server';
        console.error('Login error:', error);
      }
    });
  }

  quickLogin(airline: any) {
    this.email = airline.email;
    this.password = airline.password;
    this.onLogin();
  }
}
