import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'airline' | 'user';
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  created_at: string;
  airlineId?: number;
}

export interface UserBooking {
  booking_id: number;
  booking_reference: string;
  flight_id: number;
  flight_number: string;
  airline_name: string;
  departure_airport: string;
  arrival_airport: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  arrival_time: string;
  passenger_name: string;
  seat_number: string;
  seat_class: string;
  booking_status: 'confirmed' | 'cancelled' | 'pending';
  total_price: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Inizializza l'utente dal localStorage se disponibile
    this.loadUserFromStorage();
    
    // Ascolta eventi di cambio autenticazione
    window.addEventListener('auth-changed', () => {
      this.loadUserFromStorage();
    });
  }

  private loadUserFromStorage(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        this.logout();
      }
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token') && !!this.getCurrentUser();
  }

  // Verifica se l'utente è un ospite (non autenticato)
  isGuestUser(): boolean {
    return !this.isLoggedIn();
  }

  // Pulisce completamente i dati dell'utente (per isolamento guest)
  clearUserData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('airlineId');
    this.currentUserSubject.next(null);
    window.dispatchEvent(new Event('auth-changed'));
  }

  // Ottieni informazioni utente per auto-compilazione (solo se autenticato)
  getUserInfoForAutoFill(): User | null {
    if (this.isGuestUser()) {
      return null;
    }
    return this.getCurrentUser();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('airlineId');
    this.currentUserSubject.next(null);
    window.dispatchEvent(new Event('auth-changed'));
  }

  // Ottieni le prenotazioni dell'utente corrente
  getUserBookings(): Observable<UserBooking[]> {
    return this.http.get<UserBooking[]>(`${this.baseUrl}/bookings/user`, {
      headers: this.getAuthHeaders()
    });
  }

  // Aggiorna i dati dell'utente
  updateUserProfile(userData: Partial<User>): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/profile`, userData, {
      headers: this.getAuthHeaders()
    });
  }

  // Ottieni i dettagli completi dell'utente
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/profile`, {
      headers: this.getAuthHeaders()
    });
  }
}
