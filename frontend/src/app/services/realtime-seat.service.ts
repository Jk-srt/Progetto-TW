import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';

interface SeatUpdate {
  flightId: number;
  seatId: number;
  status: 'available' | 'temporarily_reserved' | 'booked';
  reservedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeSeatService {
  private socket$?: WebSocketSubject<any>;
  private seatUpdates$ = new BehaviorSubject<SeatUpdate[]>([]);
  private pollingSubscription?: Subscription;
  private currentFlightId?: number;
  
  // Observable per i componenti
  public seatUpdates = this.seatUpdates$.asObservable();

  constructor(private http: HttpClient) {
    this.connect();
  }

  private connect(): void {
    // WebSocket connection per updates real-time
    const wsUrl = environment.wsUrl || 'ws://localhost:3000/ws';
    
    if (!wsUrl) {
      console.warn('⚠️ WebSocket URL not configured, using polling fallback');
      this.startPolling();
      return;
    }
    
    this.socket$ = webSocket({
      url: wsUrl,
      openObserver: {
        next: () => console.log('🔗 WebSocket connected for seat updates')
      },
      closeObserver: {
        next: () => console.log('🔌 WebSocket disconnected')
      }
    });

    // Ascolta updates
    this.socket$.subscribe({
      next: (update: SeatUpdate) => {
        console.log('📡 Received seat update:', update);
        const currentUpdates = this.seatUpdates$.value;
        this.seatUpdates$.next([...currentUpdates, update]);
      },
      error: (error) => {
        console.error('❌ WebSocket error:', error);
        // Fallback to polling
        this.startPolling();
      }
    });
  }

  private startPolling(): void {
    // Fallback: polling ogni 5 secondi
    console.log('🔄 Starting polling fallback...');
    
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    
    this.pollingSubscription = interval(5000).subscribe(() => {
      if (this.currentFlightId) {
        this.checkSeatUpdates();
      }
    });
  }

  private checkSeatUpdates(): void {
    if (!this.currentFlightId) return;
    
    // Implementa logica per controllare updates via HTTP
    console.log('🔍 Checking seat updates via polling for flight:', this.currentFlightId);
    
    this.http.get<any>(`${environment.apiUrl}/seats/flight/${this.currentFlightId}/updates`)
      .subscribe({
        next: (updates) => {
          if (updates && updates.length > 0) {
            console.log('📡 Received seat updates via polling:', updates);
            const currentUpdates = this.seatUpdates$.value;
            this.seatUpdates$.next([...currentUpdates, ...updates]);
          }
        },
        error: (error) => {
          console.error('❌ Error checking seat updates:', error);
        }
      });
  }

  subscribeToFlight(flightId: number): void {
    this.currentFlightId = flightId;
    
    if (this.socket$) {
      this.socket$.next({
        action: 'subscribe',
        flightId: flightId
      });
    } else if (!this.pollingSubscription) {
      // Se non c'è WebSocket, avvia polling
      this.startPolling();
    }
  }

  unsubscribeFromFlight(flightId: number): void {
    if (this.socket$) {
      this.socket$.next({
        action: 'unsubscribe',
        flightId: flightId
      });
    }
    
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
    
    this.currentFlightId = undefined;
  }

  disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
    }
    
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
    
    this.currentFlightId = undefined;
  }
}
