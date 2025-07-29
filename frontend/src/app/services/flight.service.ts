import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Flight } from '../models/flight.model';

@Injectable({
  providedIn: 'root'
})
export class FlightService {
  private flights: Flight[] = [];

  getFlights(): Observable<Flight[]> {
    return of(this.flights);
  }

  getFlightById(id: number): Observable<Flight | undefined> {
    const flight = this.flights.find(f => f.id === id);
    return of(flight);
  }

  getActiveFlights(): Observable<Flight[]> {
    const activeFlights = this.flights.filter(f =>
      f.status === 'scheduled' || f.status === 'delayed'
    );
    return of(activeFlights);
  }

  getOnTimeFlights(): Observable<Flight[]> {
    const onTimeFlights = this.flights.filter(f => f.status === 'scheduled');
    return of(onTimeFlights);
  }

  filterFlights(filterType: 'all' | 'departures' | 'arrivals'): Observable<Flight[]> {
    let filteredFlights: Flight[] = [];

    switch (filterType) {
      case 'departures':
        filteredFlights = this.flights.filter(f =>
          f.status === 'scheduled' || f.status === 'delayed'
        );
        break;
      case 'arrivals':
        filteredFlights = this.flights.filter(f =>
          f.status === 'completed' || f.status === 'delayed'
        );
        break;
      default:
        filteredFlights = this.flights;
    }

    return of(filteredFlights);
  }
}
