import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Airport } from '../models/flight.model';

@Injectable({
  providedIn: 'root'
})
export class AirportService {
  private apiUrl = environment.apiUrl + '/airports';
  private airportsSubject = new BehaviorSubject<Airport[]>([]);
  private airportsLoaded = false;

  constructor(private http: HttpClient) {
    this.loadAirports();
  }

  /**
   * Carica tutti gli aeroporti e li mantiene in cache
   */
  private loadAirports(): void {
    if (this.airportsLoaded) return;

    this.http.get<Airport[]>(this.apiUrl).subscribe({
      next: (airports) => {
        this.airportsSubject.next(airports);
        this.airportsLoaded = true;
      },
      error: (error) => {
        console.error('Errore nel caricamento aeroporti:', error);
      }
    });
  }

  /**
   * Restituisce tutti gli aeroporti
   */
  getAirports(): Observable<Airport[]> {
    return this.airportsSubject.asObservable();
  }

  /**
   * Trova un aeroporto per nome
   */
  getAirportByName(name: string): Observable<Airport | null> {
    return this.airportsSubject.asObservable().pipe(
      map(airports => {
        return airports.find(airport => 
          airport.name.toLowerCase().includes(name.toLowerCase()) ||
          airport.city.toLowerCase() === name.toLowerCase()
        ) || null;
      })
    );
  }

  /**
   * Trova il codice IATA di un aeroporto per nome
   * Restituisce immediatamente se già in cache, altrimenti un fallback
   */
  getIataCodeByName(name: string): Observable<string> {
    if (!name) return new BehaviorSubject('N/A').asObservable();

    return this.airportsSubject.asObservable().pipe(
      map(airports => {
        if (airports.length === 0) {
          // Se non ci sono ancora aeroporti caricati, restituisci un fallback
          return this.getFallbackCode(name);
        }

        const airport = airports.find(airport => 
          airport.name.toLowerCase().includes(name.toLowerCase()) ||
          airport.city.toLowerCase() === name.toLowerCase() ||
          // Cerca anche match parziali per nomi comuni
          name.toLowerCase().includes(airport.city.toLowerCase())
        );

        return airport?.iata_code || this.getFallbackCode(name);
      })
    );
  }

  /**
   * Fornisce un codice di fallback basato su mapping noti
   */
  private getFallbackCode(name: string): string {
    const fallbacks: { [key: string]: string } = {
      'Roma Fiumicino': 'FCO',
      'Leonardo da Vinci International Airport': 'FCO',
      'Milano Malpensa': 'MXP',
      'Heathrow Airport': 'LHR', 
      'Londra Heathrow': 'LHR',
      'Charles de Gaulle Airport': 'CDG',
      'Parigi CDG': 'CDG',
      'Amsterdam Schiphol': 'AMS',
      'Amsterdam': 'AMS',
      'Francoforte': 'FRA',
      'Barcellona El Prat': 'BCN'
    };

    return fallbacks[name] || name.substring(0, 3).toUpperCase();
  }

  /**
   * Forza il ricaricamento degli aeroporti
   */
  refreshAirports(): void {
    this.airportsLoaded = false;
    this.loadAirports();
  }
}
