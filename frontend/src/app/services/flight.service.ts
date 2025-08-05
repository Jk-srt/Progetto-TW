import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Flight } from '../models/flight.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FlightService {
  private apiUrl = `${environment.apiUrl}/flights`;

  constructor(private http: HttpClient) {}

  private mapBackendFlight(backendFlight: any): Flight {
    return {
      id: backendFlight.id.toString(),
      flightNumber: backendFlight.flight_number,
      airline: backendFlight.airline_name || backendFlight.airline || 'N/A',
      origin: backendFlight.departure_airport,
      destination: backendFlight.arrival_airport,
      departureTime: new Date(backendFlight.departure_time).toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      arrivalTime: new Date(backendFlight.arrival_time).toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      price: backendFlight.price,
      status: this.mapStatus(backendFlight.status),
      // Mantieni anche i campi originali per compatibilità
      flight_number: backendFlight.flight_number,
      departure_airport: backendFlight.departure_airport,
      departure_city: backendFlight.departure_city,
      departure_code: backendFlight.departure_code,
      arrival_airport: backendFlight.arrival_airport,
      arrival_city: backendFlight.arrival_city,
      arrival_code: backendFlight.arrival_code,
      departure_time: backendFlight.departure_time,
      arrival_time: backendFlight.arrival_time,
      available_seats: backendFlight.available_seats,
      total_seats: backendFlight.total_seats,
      airline_name: backendFlight.airline_name,
      // NUOVI CAMPI PER PREZZI CON ROUTE PRICING
      flight_surcharge: backendFlight.flight_surcharge,
      economy_price: backendFlight.economy_price,
      business_price: backendFlight.business_price,
      first_price: backendFlight.first_price,
      economy_base_price: backendFlight.economy_base_price,
      business_base_price: backendFlight.business_base_price,
      first_base_price: backendFlight.first_base_price,
      route_id: backendFlight.route_id,
      route_name: backendFlight.route_name
    };
  }

  private mapStatus(status: string): 'On Time' | 'Delayed' | 'Boarding' | 'Departed' | 'scheduled' | 'delayed' | 'cancelled' | 'completed' {
    switch (status) {
      case 'scheduled': return 'On Time';
      case 'delayed': return 'Delayed';
      case 'cancelled': return 'cancelled';
      case 'completed': return 'Departed';
      default: return status as any;
    }
  }

  getFlights(): Observable<Flight[]> {
    console.log('🌐 FlightService: Method called');
    console.log('🌐 FlightService: Using fetch instead of HttpClient');
    
    return new Observable(observer => {
      fetch(this.apiUrl)
        .then(response => response.json())
        .then(flights => {
          console.log('🌐 FlightService: Fetch success:', flights);
          // Mappa i voli attraverso mapBackendFlight per includere i nuovi campi
          const mappedFlights = (flights || []).map((flight: any) => this.mapBackendFlight(flight));
          console.log('🌐 FlightService: Mapped flights:', mappedFlights);
          observer.next(mappedFlights);
          observer.complete();
        })
        .catch(error => {
          console.error('🚨 FlightService: Fetch error:', error);
          observer.error(error);
        });
    });
  }

  getFlightById(id: string): Observable<Flight> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(flight => this.mapBackendFlight(flight))
    );
  }

  getActiveFlights(): Observable<Flight[]> {
    return this.http.get<any[]>(`${this.apiUrl}/active`).pipe(
      map(flights => flights.map(flight => this.mapBackendFlight(flight)))
    );
  }

  getOnTimeFlights(): Observable<Flight[]> {
    return this.http.get<any[]>(`${this.apiUrl}/on-time`).pipe(
      map(flights => flights.map(flight => this.mapBackendFlight(flight)))
    );
  }

  filterFlights(filterType: 'all' | 'departures' | 'arrivals'): Observable<Flight[]> {
    console.log('🌐 FlightService: filterFlights called with:', filterType);
    return this.http.get<any[]>(`${this.apiUrl}/filter/${filterType}`).pipe(
      map(flights => {
        console.log('🌐 FlightService: filterFlights received:', flights);
        return flights || [];
      })
    );
  }
}
