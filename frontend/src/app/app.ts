import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <!-- Header con Navbar -->
      <header class="app-header">
        <nav class="navbar">
          <div class="nav-brand">
            <h1 routerLink="/" style="cursor: pointer;">✈️ TAW Flights</h1>
          </div>

          <!-- Navigation Menu -->
          <div class="nav-links">
            <a routerLink="/" class="nav-link" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              🏠 Home
            </a>
            <a routerLink="/flights" class="nav-link" routerLinkActive="active">
              ✈️ Voli
            </a>

            <!-- Links for authenticated users -->
            <div *ngIf="isLoggedIn" class="auth-links">
              <a routerLink="/bookings" class="nav-link" routerLinkActive="active">
                📋 Prenotazioni
              </a>

              <!-- Admin-only link -->
              <a *ngIf="currentUser?.role === 'admin'"
                 routerLink="/admin"
                 class="nav-link admin-link"
                 routerLinkActive="active">
                 👨‍💼 Admin Panel
              </a>

              <!-- User Profile Menu -->
              <div class="profile-menu-container">
                <button class="profile-btn" (click)="toggleProfileMenu()">
                  <span class="profile-avatar">{{ getUserInitials() }}</span>
                  <span class="profile-name">{{ getUserFullName() }}</span>
                  <span class="dropdown-arrow">▼</span>
                </button>

                <!-- Dropdown Menu -->
                <div *ngIf="isProfileMenuOpen" class="profile-dropdown">
                  <div class="profile-info">
                    <p class="profile-email">{{ currentUser?.email }}</p>
                    <span class="profile-role">{{ currentUser?.role }}</span>
                  </div>
                  <div class="profile-actions">
                    <button (click)="navigateToSettings()" class="dropdown-item">
                      ⚙️ Impostazioni
                    </button>
                    <button (click)="onLogout()" class="dropdown-item logout">
                      🚪 Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Links for non-authenticated users -->
            <div *ngIf="!isLoggedIn" class="guest-links">
              <a routerLink="/login" class="nav-link login-btn">
                🔑 Accedi
              </a>
              <a routerLink="/register" class="nav-link register-btn">
                ✍️ Registrati
              </a>
            </div>
          </div>
        </nav>
      </header>

      <!-- Main Content Area -->
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .app-header {
      background: linear-gradient(135deg, #1976d2, #1565c0);
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .nav-brand h1 {
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
      transition: transform 0.2s ease;
    }

    .nav-brand h1:hover {
      transform: scale(1.05);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .nav-link {
      color: white;
      text-decoration: none;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-link:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    .nav-link.active {
      background: rgba(255, 255, 255, 0.2);
      font-weight: 600;
    }

    .admin-link {
      background: rgba(255, 193, 7, 0.2) !important;
      border: 1px solid rgba(255, 193, 7, 0.3);
    }

    .admin-link:hover {
      background: rgba(255, 193, 7, 0.3) !important;
    }

    .auth-links, .guest-links {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .login-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .register-btn {
      background: rgba(76, 175, 80, 0.8);
      font-weight: 600;
    }

    .register-btn:hover {
      background: rgba(76, 175, 80, 1);
    }

    .profile-menu-container {
      position: relative;
    }

    .profile-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .profile-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .profile-avatar {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .profile-name {
      font-weight: 500;
    }

    .dropdown-arrow {
      font-size: 0.7rem;
      transition: transform 0.2s ease;
    }

    .profile-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      min-width: 200px;
      margin-top: 0.5rem;
      overflow: hidden;
      z-index: 1000;
    }

    .profile-info {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      background: #f8f9fa;
    }

    .profile-email {
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 0.25rem;
    }

    .profile-role {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .profile-actions {
      padding: 0.5rem 0;
    }

    .dropdown-item {
      width: 100%;
      padding: 0.75rem 1rem;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
      transition: background 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dropdown-item:hover {
      background: #f5f5f5;
    }

    .dropdown-item.logout {
      color: #d32f2f;
      border-top: 1px solid #eee;
    }

    .dropdown-item.logout:hover {
      background: #ffebee;
    }

    .app-main {
      flex: 1;
      min-height: calc(100vh - 200px);
    }

    @media (max-width: 768px) {
      .navbar {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
      }

      .nav-links {
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5rem;
      }

      .nav-link {
        font-size: 0.9rem;
        padding: 0.4rem 0.8rem;
      }

      .profile-name {
        display: none;
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  currentUser: any = null;
  isProfileMenuOpen = false;
  private authSubscription: Subscription = new Subscription();

  constructor(
    private router: Router
  ) {}

  ngOnInit() {
    // Check authentication from localStorage
    this.checkAuthStatus();

    // Listen for auth changes from login component
    window.addEventListener('auth-changed', () => {
      this.checkAuthStatus();
    });
  }

  private checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        this.currentUser = JSON.parse(user);
        this.isLoggedIn = true;
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.logout();
      }
    }
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }

  // Chiude il menu quando si clicca fuori di esso
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-menu-container')) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu() {
    console.log('Toggle profile menu clicked, current state:', this.isProfileMenuOpen);
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
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

  isAirlineUser(): boolean {
    return this.currentUser?.role === 'airline';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn = false;
    this.currentUser = null;
    this.isProfileMenuOpen = false;
    this.router.navigate(['/']);
  }

  onLogout() {
    console.log('Logout clicked');
    this.logout();
  }

  navigateToProfile() {
    this.isProfileMenuOpen = false;
    // this.router.navigate(['/profile']); // Temporarily disabled
    console.log('Profile navigation disabled');
  }

  navigateToBookings() {
    this.isProfileMenuOpen = false;
    this.router.navigate(['/bookings']);
  }

  navigateToSettings() {
    this.isProfileMenuOpen = false;
    this.router.navigate(['/settings']);
  }
}
