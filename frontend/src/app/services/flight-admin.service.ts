import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Flight, Airport, Airline, Aircraft, FlightFormData } from '../models/flight.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FlightAdminService {
  private readonly API_URL = `${environment.apiUrl}/flights`;
  
  // Subject per aggiornamenti in tempo reale
  private flightsSubject = new BehaviorSubject<Flight[]>([]);
  public flights$ = this.flightsSubject.asObservable();

  constructor(
    private http: HttpClient
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  private getCurrentUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  private isAirline(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'airline';
  }

  private isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  private getUserAirlineId(): string | null {
    const user = this.getCurrentUser();
    return user?.airline_id ? user.airline_id.toString() : null;
  }

  // Gestione voli - solo per la propria compagnia aerea
  getFlights(): Observable<Flight[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Flight[]>(this.API_URL, { headers });
  }

  getFlight(id: number): Observable<Flight> {
    const headers = this.getAuthHeaders();
    return this.http.get<Flight>(`${this.API_URL}/${id}`, { headers });
  }

  createFlight(flightData: FlightFormData): Observable<any> {
    const headers = this.getAuthHeaders();
    
    // Aggiungi automaticamente l'ID della compagnia aerea se l'utente è una compagnia
    if (this.isAirline()) {
      const airlineId = this.getUserAirlineId();
      if (airlineId) {
        flightData.airline_id = parseInt(airlineId) || 1;
      }
    }
    
    return this.http.post<any>(this.API_URL, flightData, { headers });
  }

  updateFlight(id: number, flightData: FlightFormData): Observable<any> {
    const headers = this.getAuthHeaders();
    
    // Assicurati che la compagnia aerea possa modificare solo i propri voli
    if (this.isAirline()) {
      const airlineId = this.getUserAirlineId();
      if (airlineId) {
        flightData.airline_id = parseInt(airlineId) || 1;
      }
    }
    
    return this.http.put<any>(`${this.API_URL}/${id}`, flightData, { headers });
  }

  deleteFlight(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.API_URL}/${id}`, { headers });
  }

  // Dati di supporto per i form
  getAirports(): Observable<Airport[]> {
    return this.http.get<Airport[]>(`${this.API_URL}/data/airports`);
  }

  getAirlines(): Observable<Airline[]> {
    return this.http.get<Airline[]>(`${this.API_URL}/data/airlines`);
  }

  getAircrafts(): Observable<Aircraft[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Aircraft[]>(`${this.API_URL}/data/aircrafts`, { headers });
  }

  // Ottieni gli aerei di una compagnia specifica
  getAircraftsByAirline(airlineId: number): Observable<Aircraft[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Aircraft[]>(`${environment.apiUrl}/airlines/${airlineId}/aircrafts`, { headers });
  }

  // Aggiorna la lista locale
  refreshFlights(): void {
    this.getFlights().subscribe(flights => {
      this.flightsSubject.next(flights);
    });
  }

  // Verifica se l'utente può gestire un volo specifico
  canManageFlight(flight: Flight): boolean {
    if (this.isAdmin()) {
      return true;
    }
    
    if (this.isAirline()) {
      const userAirlineId = this.getUserAirlineId();
      return flight.airline_id === parseInt(userAirlineId || '0');
    }
    
    return false;
  }

  // Verifica se l'utente può accedere alla gestione voli
  canAccessFlightManagement(): boolean {
    return this.isAirline() || this.isAdmin();
  }
}
