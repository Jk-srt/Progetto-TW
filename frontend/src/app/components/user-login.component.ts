import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>🔐 Accedi al Sistema</h2>
        <p class="login-subtitle">Inserisci le tue credenziali per accedere come utente, compagnia aerea o amministratore</p>
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
          <div *ngIf="errorMessage" class="error-message" style="color: red; margin-top: 10px;">{{ errorMessage }}</div>
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
      margin-bottom: 10px;
      color: #1976d2;
      font-size: 1.5rem;
    }

    .login-subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
      font-size: 0.9rem;
      line-height: 1.4;
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

    .error-message {
      color: red;
      margin-top: 10px;
      text-align: center;
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
    private router: Router,
    private route: ActivatedRoute
  ) {}

  onLogin() {
    this.isLoading = true;
    this.errorMessage = null;

    // Login unificato per tutti i tipi di utente
    this.http.post<any>(`${environment.apiUrl}/auth/login`, this.loginData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            // Store token and user data
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            console.log('🛫 AirlineId:', response.user.airlineId);
            localStorage.setItem('airlineId', response.user.airlineId);

            // Dispatch auth change event
            window.dispatchEvent(new Event('auth-changed'));
            
            console.log('Login successful:', response);

            // Forza cambio password per airline al primo accesso
            if (response.user.role === 'airline' && response.user.must_change_password) {
              this.router.navigate(['/settings'], { queryParams: { forcePassword: '1' } });
              return;
            }

            // Se c'è un returnUrl, priorità a quello
            const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
            if (returnUrl) {
              // Se esiste stato guest salvato, ripristina checkout
              const pendingRaw = sessionStorage.getItem('guestPendingCheckout');
              if (pendingRaw) {
                try {
                  const pending = JSON.parse(pendingRaw);
                  sessionStorage.removeItem('guestPendingCheckout');
                  this.router.navigate(['/checkout'], { state: pending });
                  return;
                } catch {}
              }
              this.router.navigateByUrl(returnUrl);
              return;
            }

            // Altrimenti routing per ruolo
            switch (response.user.role) {
              case 'admin':
                this.router.navigate(['/admin']);
                break;
              case 'airline':
                this.router.navigate(['/flight-admin']);
                break;
              case 'user':
                this.router.navigate(['/']);
                break;
              default:
                this.router.navigate(['/']);
            }
          } else {
            this.errorMessage = response.message || 'Errore durante il login';
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Credenziali non valide o errore di connessione';
          console.error('Login error:', error);
        }
      });
   }
}
