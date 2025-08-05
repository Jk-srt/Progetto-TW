import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Interfacce per la struttura dati
export interface Passenger {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface Booking {
  booking_id: number;
  booking_reference: string;
  booking_status: string;
  booking_price: number;
  booking_date: string;
  passenger: Passenger;
  seat_number: string;
  booking_class: string;
}

export interface Route {
  departure: {
    airport_name: string;
    airport_code: string;
    city: string;
  };
  arrival: {
    airport_name: string;
    airport_code: string;
    city: string;
  };
}

export interface Aircraft {
  registration: string;
  type: string;
  model: string;
}

export interface Airline {
  name: string;
  code: string;
}

export interface FlightBookings {
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  flight_status: string;
  route: Route;
  aircraft: Aircraft;
  airline: Airline;
  bookings: Booking[];
  total_bookings: number;
  total_revenue: number;
  seats_by_class: {
    economy: number;
    business: number;
    first: number;
  };
}

export interface Statistics {
  total_bookings: number;
  active_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  average_booking_value: number;
}

export interface AirlineBookingsData {
  airline: Airline;
  flights: FlightBookings[];
  statistics: Statistics;
}

export interface ApiResponse {
  success: boolean;
  data: AirlineBookingsData;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AirlineBookingsService {
  private readonly apiUrl = '/api/bookings/admin/airline-bookings';
  
  // Stati reattivi
  private bookingsDataSubject = new BehaviorSubject<AirlineBookingsData | null>(null);
  public bookingsData$ = this.bookingsDataSubject.asObservable();
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('🎯 AirlineBookingsService: Initialized');
  }

  /**
   * Carica le prenotazioni della compagnia aerea
   */
  loadAirlineBookings(): Observable<AirlineBookingsData> {
    console.log('📥 AirlineBookingsService: Loading airline bookings...');
    
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Headers con autenticazione
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<ApiResponse>(this.apiUrl, { headers }).pipe(
      map(response => {
        console.log('✅ AirlineBookingsService: Data loaded successfully', response);
        
        if (response.success && response.data) {
          this.bookingsDataSubject.next(response.data);
          this.loadingSubject.next(false);
          return response.data;
        } else {
          throw new Error(response.message || 'Errore nel caricamento dei dati');
        }
      }),
      catchError(error => {
        console.error('❌ AirlineBookingsService: Error loading bookings', error);
        
        let errorMessage = 'Errore nel caricamento delle prenotazioni';
        
        if (error.status === 403) {
          errorMessage = 'Accesso non autorizzato. Solo gli amministratori delle compagnie aeree possono accedere.';
        } else if (error.status === 401) {
          errorMessage = 'Sessione scaduta. Effettua nuovamente l\'accesso.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.errorSubject.next(errorMessage);
        this.loadingSubject.next(false);
        this.bookingsDataSubject.next(null);
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Ottieni le prenotazioni per un volo specifico
   */
  getBookingsForFlight(flightNumber: string): Booking[] {
    const currentData = this.bookingsDataSubject.value;
    if (!currentData) return [];
    
    const flight = currentData.flights.find(f => f.flight_number === flightNumber);
    return flight ? flight.bookings : [];
  }

  /**
   * Ottieni statistiche per classe di posto
   */
  getSeatClassStatistics(): { [key: string]: number } {
    const currentData = this.bookingsDataSubject.value;
    if (!currentData) return {};
    
    const classStats = {
      economy: 0,
      business: 0,
      first: 0
    };
    
    currentData.flights.forEach(flight => {
      classStats.economy += flight.seats_by_class.economy || 0;
      classStats.business += flight.seats_by_class.business || 0;
      classStats.first += flight.seats_by_class.first || 0;
    });
    
    return classStats;
  }

  /**
   * Ottieni il tasso di occupazione per volo
   */
  getOccupancyRate(flight: FlightBookings): number {
    // Questa funzione richiederebbe informazioni sulla capacità totale dell'aereo
    // Per ora restituiamo una percentuale basata sui posti prenotati
    const totalSeats = flight.seats_by_class.economy + flight.seats_by_class.business + flight.seats_by_class.first;
    return totalSeats > 0 ? (flight.total_bookings / (totalSeats * 1.2)) * 100 : 0; // Stima approssimativa
  }

  /**
   * Filtra prenotazioni per stato
   */
  filterBookingsByStatus(status: string): Booking[] {
    const currentData = this.bookingsDataSubject.value;
    if (!currentData) return [];
    
    const allBookings: Booking[] = [];
    currentData.flights.forEach(flight => {
      allBookings.push(...flight.bookings.filter(booking => booking.booking_status === status));
    });
    
    return allBookings;
  }

  /**
   * Forza il reload dei dati
   */
  refreshData(): void {
    console.log('🔄 AirlineBookingsService: Refreshing data...');
    this.loadAirlineBookings().subscribe();
  }

  /**
   * Reset dello stato del servizio
   */
  reset(): void {
    console.log('🔄 AirlineBookingsService: Resetting state...');
    this.bookingsDataSubject.next(null);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
  }

  /**
   * Ottieni i dati correnti (sincrono)
   */
  getCurrentData(): AirlineBookingsData | null {
    return this.bookingsDataSubject.value;
  }
}
