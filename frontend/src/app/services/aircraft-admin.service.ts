import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

interface AircraftApiResponse {
  aircrafts: Aircraft[];
  airline: {
    id: number;
    name: string;
  };
  total: number;
}

export interface Aircraft {
  id: number;
  airline_id: number;
  registration: string;
  aircraft_type: string;
  manufacturer: string;
  model: string;
  seat_capacity: number;
  business_class_seats: number;
  economy_class_seats: number;
  manufacturing_year?: number;
  last_maintenance?: Date;
  status: 'active' | 'maintenance' | 'retired';
  created_at: Date;
  updated_at: Date;
  airline_name?: string;
}

export interface AircraftFormData {
  registration: string;
  aircraft_type: string;
  manufacturer: string;
  model: string;
  seat_capacity: number;
  business_class_seats: number;
  economy_class_seats: number;
  manufacturing_year?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AircraftAdminService {
  private readonly API_URL = `${environment.apiUrl}/aircrafts`;
  private aircraftsSubject = new BehaviorSubject<Aircraft[]>([]);
  public aircrafts$ = this.aircraftsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  private getCurrentUser(): any {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  private isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  private isAirline(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'airline_admin' || user?.role === 'airline_user';
  }

  // CRUD per gli aeromobili
  getAircrafts(): Observable<Aircraft[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Aircraft[]>(this.API_URL, { headers });
  }

  getMyAircrafts(): Observable<Aircraft[]> {
    console.log('AircraftAdminService: Calling getMyAircrafts()');
    const headers = this.getAuthHeaders();
    console.log('Headers:', headers);
    console.log('URL:', `${this.API_URL}/my-aircrafts`);
    return this.http.get<AircraftApiResponse>(`${this.API_URL}/my-aircrafts`, { headers })
      .pipe(
        map((response: AircraftApiResponse) => {
          console.log('AircraftAdminService: API Response:', response);
          return response.aircrafts || [];
        })
      );
  }

  createAircraft(aircraftData: AircraftFormData): Observable<Aircraft> {
    const headers = this.getAuthHeaders();
    return this.http.post<Aircraft>(this.API_URL, aircraftData, { headers });
  }

  updateAircraft(id: number, aircraftData: Partial<AircraftFormData>): Observable<Aircraft> {
    const headers = this.getAuthHeaders();
    return this.http.put<Aircraft>(`${this.API_URL}/${id}`, aircraftData, { headers });
  }

  deleteAircraft(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/${id}`, { headers });
  }

  // Verifica se la registrazione è già esistente
  checkRegistrationExists(registration: string): Observable<{ exists: boolean }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ exists: boolean }>(`${this.API_URL}/check-registration/${registration}`, { headers });
  }

  // Aggiorna lo stato di un aeromobile
  updateAircraftStatus(id: number, status: 'active' | 'maintenance' | 'retired'): Observable<Aircraft> {
    const headers = this.getAuthHeaders();
    return this.http.patch<Aircraft>(`${this.API_URL}/${id}/status`, { status }, { headers });
  }

  // Aggiorna la lista locale
  updateAircraftsList(aircrafts: Aircraft[]): void {
    this.aircraftsSubject.next(aircrafts);
  }
}
