import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Route, RouteFormData } from '../models/route.model';
import { Airport } from '../models/flight.model';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RouteAdminService {
  private readonly API_URL = `${environment.apiUrl}/routes`;
  private routesSubject = new BehaviorSubject<Route[]>([]);
  public routes$ = this.routesSubject.asObservable();

  constructor(private http: HttpClient) {}

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

  private isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  private isAirline(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'airline';
  }

  // CRUD per le rotte
  getRoutes(): Observable<Route[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Route[]>(this.API_URL, { headers });
  }

  getRoutesByAirline(airlineId: number): Observable<Route[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Route[]>(`${this.API_URL}/airline/${airlineId}`, { headers });
  }

  getRoute(id: number): Observable<Route> {
    const headers = this.getAuthHeaders();
    return this.http.get<Route>(`${this.API_URL}/${id}`, { headers });
  }

  createRoute(data: RouteFormData): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(this.API_URL, data, { headers });
  }

  updateRoute(id: number, data: RouteFormData): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.API_URL}/${id}`, data, { headers });
  }

  deleteRoute(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete<any>(`${this.API_URL}/${id}`, { headers });
  }

  // Dati di supporto
  getAirports(): Observable<Airport[]> {
    return this.http.get<Airport[]>(`${environment.apiUrl}/airports`);
  }

  refreshRoutes(): void {
    this.getRoutes().subscribe(routes => this.routesSubject.next(routes));
  }

  canManageRoute(route: Route): boolean {
    if (this.isAdmin()) {
      return true;
    }
    if (this.isAirline()) {
      return true;
    }
    return false;
  }

  canAccessRouteManagement(): boolean {
    return this.isAdmin() || this.isAirline();
  }
}
