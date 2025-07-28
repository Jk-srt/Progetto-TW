import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  currentUser: any = null;
  isProfileMenuOpen = false;
  private authSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Sottoscrizione ai cambiamenti dello stato di autenticazione
    this.authSubscription.add(
      this.authService.isLoggedIn$.subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
      })
    );

    this.authSubscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );
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
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  getUserInitials(): string {
    return this.authService.getUserInitials();
  }

  getUserFullName(): string {
    return this.authService.getUserFullName();
  }

  onLogout() {
    this.authService.logout();
    this.isProfileMenuOpen = false;
    this.router.navigate(['/']);
  }

  navigateToProfile() {
    this.isProfileMenuOpen = false;
    this.router.navigate(['/profile']);
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
