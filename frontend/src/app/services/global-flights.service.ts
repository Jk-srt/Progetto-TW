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

  // Aggiungi un nuovo volo alla lista globale
  addFlightToGlobal(flight: any): void {
    this._flights.push(flight);
    this._flightsSubject.next([...this._flights]);
    console.log('🌍 GlobalFlightsService: Flight added to global list');
  }

  // Aggiorna un volo nella lista globale
  updateFlightInGlobal(updatedFlight: any): void {
    const index = this._flights.findIndex(f => f.id === updatedFlight.id);
    if (index !== -1) {
      this._flights[index] = updatedFlight;
      this._flightsSubject.next([...this._flights]);
      console.log('🌍 GlobalFlightsService: Flight updated in global list');
    }
  }

  // Rimuovi un volo dalla lista globale
  removeFlightFromGlobal(flightId: number): void {
    this._flights = this._flights.filter(f => f.id !== flightId);
    this._flightsSubject.next([...this._flights]);
    console.log('🌍 GlobalFlightsService: Flight removed from global list');
  }
}
