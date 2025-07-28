import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalFlightsService {
  // Variabile globale per i flights
  private _flights: any[] = [];
  private _flightsSubject = new BehaviorSubject<any[]>([]);
  
  // Observable per far reagire i componenti ai cambiamenti
  public flights$: Observable<any[]> = this._flightsSubject.asObservable();

  constructor() {
    console.log('🌍 GlobalFlightsService: Initialized');
  }

  // Setter per impostare i flights globalmente
  setFlights(flights: any[]): void {
    console.log('🌍 GlobalFlightsService: Setting flights globally:', flights.length);
    this._flights = flights;
    this._flightsSubject.next(flights);
  }

  // Getter per ottenere i flights
  getFlights(): any[] {
    console.log('🌍 GlobalFlightsService: Getting flights:', this._flights.length);
    return this._flights;
  }

  // Getter per il count
  getFlightsCount(): number {
    return this._flights.length;
  }

  // Load flights direttamente nel service globale
  loadFlightsGlobally(): Promise<any[]> {
    console.log('🌍 GlobalFlightsService: Loading flights globally...');
    
    return fetch('http://localhost:3000/api/flights')
      .then(response => response.json())
      .then(flights => {
        console.log('🌍 GlobalFlightsService: Fetch SUCCESS:', flights.length, 'flights');
        this.setFlights(flights);
        return flights;
      })
      .catch(error => {
        console.error('🌍 GlobalFlightsService: Fetch ERROR:', error);
        this.setFlights([]);
        throw error;
      });
  }
}
