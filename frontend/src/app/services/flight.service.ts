import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Flight } from '../models/flight.model';

@Injectable({
  providedIn: 'root'
})
export class FlightService {
  private flights: Flight[] = [
    {
      id: '1',
      flightNumber: 'AZ123',
      airline: 'Alitalia',
      origin: 'Roma Fiumicino',
      destination: 'Milano Malpensa',
      departureTime: '08:30',
      arrivalTime: '09:45',
      price: 89,
      status: 'On Time',
      aircraft: 'Airbus A320'
    },
    {
      id: '2',
      flightNumber: 'LH456',
      airline: 'Lufthansa',
      origin: 'Milano Malpensa',
      destination: 'Francoforte',
      departureTime: '11:15',
      arrivalTime: '12:30',
      price: 156,
      status: 'Boarding',
      aircraft: 'Boeing 737'
    },
    {
      id: '3',
      flightNumber: 'AF789',
      airline: 'Air France',
      origin: 'Parigi CDG',
      destination: 'Roma Fiumicino',
      departureTime: '14:20',
      arrivalTime: '16:10',
      price: 134,
      status: 'Delayed',
      aircraft: 'Airbus A319'
    },
    {
      id: '4',
      flightNumber: 'BA101',
      airline: 'British Airways',
      origin: 'Londra Heathrow',
      destination: 'Milano Malpensa',
      departureTime: '16:45',
      arrivalTime: '19:20',
      price: 198,
      status: 'On Time',
      aircraft: 'Boeing 787'
    },
    {
      id: '5',
      flightNumber: 'KL234',
      airline: 'KLM',
      origin: 'Amsterdam',
      destination: 'Roma Fiumicino',
      departureTime: '18:30',
      arrivalTime: '20:45',
      price: 167,
      status: 'Departed',
      aircraft: 'Airbus A330'
    }
  ];

  getFlights(): Observable<Flight[]> {
    return of(this.flights);
  }

  getFlightById(id: string): Observable<Flight | undefined> {
    const flight = this.flights.find(f => f.id === id);
    return of(flight);
  }

  getActiveFlights(): Observable<Flight[]> {
    const activeFlights = this.flights.filter(f => 
      f.status === 'Boarding' || f.status === 'On Time'
    );
    return of(activeFlights);
  }

  getOnTimeFlights(): Observable<Flight[]> {
    const onTimeFlights = this.flights.filter(f => f.status === 'On Time');
    return of(onTimeFlights);
  }

  filterFlights(filterType: 'all' | 'departures' | 'arrivals'): Observable<Flight[]> {
    let filteredFlights: Flight[] = [];
    
    switch (filterType) {
      case 'departures':
        filteredFlights = this.flights.filter(f => 
          f.status === 'Boarding' || f.status === 'On Time'
        );
        break;
      case 'arrivals':
        filteredFlights = this.flights.filter(f => 
          f.status === 'Departed' || f.status === 'Delayed'
        );
        break;
      default:
        filteredFlights = this.flights;
    }
    
    return of(filteredFlights);
  }
}
