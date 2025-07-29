import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  styleUrls: ['./app.scss']
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
