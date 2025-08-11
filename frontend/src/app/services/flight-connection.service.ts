import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import { Flight } from '../models/flight.model';
import { environment } from '../../environments/environment';

export interface FlightConnection {
  id: string;
  outboundFlight: Flight;
  returnFlight?: Flight;
  connectionFlight?: Flight;
  totalDuration: number; // in minutes
  totalPrice: number;
  connectionTime?: number; // in minutes
  connectionAirport?: string;
  isDirectFlight: boolean;
  isConnectionFlight: boolean;
}

export interface FlightSearchRequest {
  departure_city: string;
  arrival_city: string;
  departure_date?: string; // opzionale
  return_date?: string;
  passengers: number;
  max_connections?: number; // 0 = solo diretti, 1 = max 1 scalo
}

@Injectable({
  providedIn: 'root'
})
export class FlightConnectionService {
  private apiUrl = environment.apiUrl + '/flights';

  constructor(private http: HttpClient) {}

  /**
   * Cerca voli diretti e con scali fino a 1 connessione intermedia
   */
  searchFlights(searchRequest: FlightSearchRequest): Observable<FlightConnection[]> {
    let params = new HttpParams()
      .set('departure_city', searchRequest.departure_city)
      .set('arrival_city', searchRequest.arrival_city)
      .set('max_connections', (searchRequest.max_connections || 1).toString());

    if (searchRequest.departure_date) {
      params = params.set('departure_date', searchRequest.departure_date);
    }

    if (searchRequest.return_date) {
      params = params.set('return_date', searchRequest.return_date);
    }

    return this.http.get<any>(`${this.apiUrl}/connections`, { params })
      .pipe(
        map(response => {
          const connections: FlightConnection[] = [];
          
          if (response.flights) {
            response.flights.forEach((flight: any) => {
              if (flight.connection_type === 'direct') {
                connections.push(this.createDirectConnection(flight));
              } else if (flight.connection_type === 'connection') {
                connections.push(this.createConnectionFromResponse(flight));
              }
            });
          }
          
          return connections;
        })
      );
  }

  /**
   * Cerca solo voli diretti
   */
  private searchDirectFlights(searchRequest: FlightSearchRequest): Observable<FlightConnection[]> {
    let params = new HttpParams()
      .set('departure_city', searchRequest.departure_city)
      .set('arrival_city', searchRequest.arrival_city)
      .set('passengers', searchRequest.passengers.toString());

    if (searchRequest.departure_date) {
      params = params.set('departure_date', searchRequest.departure_date);
    }

    if (searchRequest.return_date) {
      params = params.set('return_date', searchRequest.return_date);
    }

    return this.http.get<Flight[]>(`${this.apiUrl}/search`, { params })
      .pipe(
        map(flights => {
          return flights.map(flight => this.createDirectConnection(flight));
        })
      );
  }

  /**
   * Cerca voli con 1 scalo intermedio
   */
  private searchConnectionFlights(searchRequest: FlightSearchRequest): Observable<FlightConnection[]> {
    return new Observable(observer => {
      // Prima ottieni tutti gli aeroporti disponibili per trovare possibili hub di connessione
      this.getIntermediateAirports(searchRequest.departure_city, searchRequest.arrival_city)
        .subscribe({
          next: intermediateAirports => {
            if (intermediateAirports.length === 0) {
              observer.next([]);
              observer.complete();
              return;
            }

            const connectionSearches = intermediateAirports.map(airport => 
              this.searchViaConnection(searchRequest, airport)
            );

            // Esegui tutte le ricerche in parallelo
            forkJoin(connectionSearches).subscribe({
              next: results => {
                const allConnections = results.flat().filter(conn => conn !== null);
                observer.next(allConnections as FlightConnection[]);
                observer.complete();
              },
              error: error => {
                console.error('Errore nelle ricerche con connessioni:', error);
                observer.next([]);
                observer.complete();
              }
            });
          },
          error: error => {
            console.error('Errore nel recupero aeroporti intermedi:', error);
            observer.next([]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Cerca voli via un aeroporto di connessione specifico
   */
  private searchViaConnection(
    originalRequest: FlightSearchRequest, 
    connectionAirport: string
  ): Observable<FlightConnection[]> {
    
    // Cerca voli da origine a connessione
    let firstLegParams = new HttpParams()
      .set('departure_city', originalRequest.departure_city)
      .set('arrival_city', connectionAirport)
      .set('passengers', originalRequest.passengers.toString());

    if (originalRequest.departure_date) {
      firstLegParams = firstLegParams.set('departure_date', originalRequest.departure_date);
    }

    // Cerca voli da connessione a destinazione
    let secondLegParams = new HttpParams()
      .set('departure_city', connectionAirport)
      .set('arrival_city', originalRequest.arrival_city)
      .set('passengers', originalRequest.passengers.toString());

    if (originalRequest.departure_date) {
      secondLegParams = secondLegParams.set('departure_date', originalRequest.departure_date);
    }

    const firstLegSearch = this.http.get<Flight[]>(`${this.apiUrl}/search`, { params: firstLegParams });
    const secondLegSearch = this.http.get<Flight[]>(`${this.apiUrl}/search`, { params: secondLegParams });

    return forkJoin([firstLegSearch, secondLegSearch]).pipe(
      map(([firstLegFlights, secondLegFlights]) => {
        const validConnections: FlightConnection[] = [];

        firstLegFlights.forEach(firstFlight => {
          secondLegFlights.forEach(secondFlight => {
            const connection = this.createConnectionIfValid(firstFlight, secondFlight, connectionAirport);
            if (connection) {
              validConnections.push(connection);
            }
          });
        });

        return validConnections;
      })
    );
  }

  /**
   * Crea una connessione se è valida (tempo di scalo >= 2 ore)
   */
  private createConnectionIfValid(
    firstFlight: Flight, 
    secondFlight: Flight, 
    connectionAirport: string
  ): FlightConnection | null {
    
    const firstArrival = new Date(firstFlight.arrival_time || '');
    const secondDeparture = new Date(secondFlight.departure_time || '');
    
    // Calcola il tempo di connessione in minuti
    const connectionTimeMs = secondDeparture.getTime() - firstArrival.getTime();
    const connectionTimeMinutes = connectionTimeMs / (1000 * 60);
    
    // Verifica che ci siano almeno 2 ore (120 minuti) per il trasferimento
    if (connectionTimeMinutes < 120) {
      return null;
    }

    // Verifica che il secondo volo parta lo stesso giorno o il giorno successivo
    if (connectionTimeMinutes > 24 * 60) { // Massimo 24 ore di attesa
      return null;
    }

    const firstDeparture = new Date(firstFlight.departure_time || '');
    const secondArrival = new Date(secondFlight.arrival_time || '');
    const totalDurationMs = secondArrival.getTime() - firstDeparture.getTime();
    const totalDurationMinutes = totalDurationMs / (1000 * 60);

    const totalPrice = this.calculateFlightPrice(firstFlight) + this.calculateFlightPrice(secondFlight);

    return {
      id: `${firstFlight.id}-${secondFlight.id}`,
      outboundFlight: firstFlight,
      connectionFlight: secondFlight,
      totalDuration: totalDurationMinutes,
      totalPrice: totalPrice,
      connectionTime: connectionTimeMinutes,
      connectionAirport: connectionAirport,
      isDirectFlight: false,
      isConnectionFlight: true
    };
  }

  /**
   * Crea una connessione per un volo diretto
   */
  private createDirectConnection(flight: Flight): FlightConnection {
    const departure = new Date(flight.departure_time || '');
    const arrival = new Date(flight.arrival_time || '');
    const durationMs = arrival.getTime() - departure.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    return {
      id: flight.id.toString(),
      outboundFlight: flight,
      totalDuration: durationMinutes,
      totalPrice: this.calculateFlightPrice(flight),
      isDirectFlight: true,
      isConnectionFlight: false
    };
  }

  /**
   * Crea una connessione dal formato di risposta del backend per voli con scalo
   */
  private createConnectionFromResponse(response: any): FlightConnection {
    return {
      id: `${response.first_flight.id}-${response.second_flight.id}`,
      outboundFlight: response.first_flight,
      connectionFlight: response.second_flight,
      totalDuration: response.totals.duration_minutes,
      totalPrice: response.totals.economy_price, // Usa il prezzo economy come base
      connectionTime: response.connection_info.connection_minutes,
      connectionAirport: response.connection_info.city,
      isDirectFlight: false,
      isConnectionFlight: true
    };
  }

  /**
   * Calcola il prezzo del volo (usa il prezzo più basso disponibile)
   */
  private calculateFlightPrice(flight: Flight): number {
    const prices: number[] = [];
    
    if (flight.economy_price && flight.economy_price > 0) {
      prices.push(flight.economy_price);
    }
    if (flight.business_price && flight.business_price > 0) {
      prices.push(flight.business_price);
    }
    if (flight.first_price && flight.first_price > 0) {
      prices.push(flight.first_price);
    }
    
    return prices.length > 0 ? Math.min(...prices) : 0;
  }

  /**
   * Ottiene gli aeroporti che potrebbero fungere da hub intermedi
   */
  private getIntermediateAirports(departureCity: string, arrivalCity: string): Observable<string[]> {
    // Per ora usa una lista statica di aeroporti hub principali
    // In futuro potrebbe essere chiamata da un'API dedicata
    const majorHubs = [
      'Roma', 'Milano', 'Francoforte', 'Amsterdam', 'Parigi CDG', 
      'Londra Heathrow', 'Monaco', 'Zurigo', 'Vienna', 'Madrid'
    ];

    // Filtra gli hub escludendo città di partenza e arrivo
    const availableHubs = majorHubs.filter(hub => 
      hub !== departureCity && 
      hub !== arrivalCity &&
      !departureCity.includes(hub) &&
      !arrivalCity.includes(hub)
    );

    return of(availableHubs.slice(0, 3)); // Limita a 3 hub per performance
  }

  /**
   * Formatta la durata in formato leggibile
   */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * Formatta il tempo di connessione
   */
  formatConnectionTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }
}
