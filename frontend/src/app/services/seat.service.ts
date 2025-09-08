import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription } from 'rxjs';
import { 
  FlightSeatMap, 
  SeatMapResponse, 
  SeatReservationResponse, 
  BookingConfirmationResponse,
  PassengerData,
  SeatSelectionState 
} from '../models/seat.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SeatService {
  private baseUrl = `${environment.apiUrl}/seats`;
  private sessionId: string;
  
  // Subject per gestire lo stato di selezione posti
  private seatSelectionState = new BehaviorSubject<SeatSelectionState>({
    selectedSeats: [],
    sessionId: '',
    passengers: []
  });
  
  public seatSelection$ = this.seatSelectionState.asObservable();
  
  // Timer per countdown scadenza
  private countdownSubscription?: Subscription;
  private countdownSubject = new BehaviorSubject<number>(0);
  public countdown$ = this.countdownSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.sessionId = this.generateSessionId();
    this.updateSessionId(this.sessionId);
    
    // Cleanup automatico quando l'utente chiude la pagina/tab
    this.setupPageUnloadHandler();
    
    // Ascolta cambiamenti di autenticazione per pulire la selezione
    this.setupAuthListener();

    // Listener navigazione: se l'utente torna alla home (/) libera i posti selezionati
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationStart) {
        // Normalizza URL (rimuove querystring o hash)
        const rawUrl = ev.url.split('?')[0].split('#')[0];
        if (rawUrl === '/' || rawUrl === '') {
          const current = this.seatSelectionState.value;
          if (current.selectedSeats.length > 0) {
            console.log('[SeatService] Navigazione alla home – rilascio prenotazioni temporanee e reset selezione');
            this.clearSelection();
          }
        }
      }
    });
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }

  private updateSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    const currentState = this.seatSelectionState.value;
    this.seatSelectionState.next({
      ...currentState,
      sessionId
    });
  }

  private getHeaders(): HttpHeaders {
    const headers: any = {
      'Content-Type': 'application/json',
      'X-Session-Id': this.sessionId
    };
    
    // Aggiungi il token JWT se disponibile
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return new HttpHeaders(headers);
  }

  // Setup listener per cambiamenti di autenticazione
  private setupAuthListener(): void {
    window.addEventListener('auth-changed', () => {
  console.log('🔄 Auth changed - preserving guest seat selection and claiming reservations');
  // Non puliamo la selezione: la convertiremo lato backend (claim)
    });
  }

  // Setup handler per rilasciare prenotazioni quando l'utente esce
  private setupPageUnloadHandler(): void {
    window.addEventListener('beforeunload', (event) => {
      // Usa sendBeacon per inviare richiesta async anche se la pagina si chiude
      const data = new Blob([JSON.stringify({ session_id: this.sessionId })], {
        type: 'application/json'
      });
      navigator.sendBeacon(`${this.baseUrl}/release-session`, data);
    });

    // Gestisce anche quando l'utente naviga via (SPA)
    window.addEventListener('popstate', () => {
      this.releaseAllReservations().subscribe();
    });
  }

  /**
   * Ottiene la mappa dei posti per un volo
   */
  getFlightSeatMap(flightId: number): Observable<SeatMapResponse> {
    return this.http.get<SeatMapResponse>(
      `${this.baseUrl}/flight/${flightId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Riserva temporaneamente un posto (15 minuti)
   */
  reserveSeat(flightId: number, seatId: number, userId?: number): Observable<SeatReservationResponse> {
    const data = {
      flight_id: flightId,
      seat_ids: [seatId], // Cambiato da seat_id a seat_ids per compatibilità con nuovo endpoint
      session_id: this.sessionId
    };

    const headers = this.getHeaders();
    return this.http.post<SeatReservationResponse>(`${environment.apiUrl}/seat-reservations/reserve`, data, { headers });
  }

  /**
   * Rilascia una prenotazione temporanea
   */
  releaseSeat(flightId: number, seatId: number): Observable<any> {
    const data = {
      flight_id: flightId,
      seat_id: seatId,
      session_id: this.sessionId
    };

    return this.http.post(`${this.baseUrl}/release`, data);
  }

  /**
   * Rilascia tutte le prenotazioni della sessione corrente
   */
  releaseAllReservations(): Observable<any> {
    const data = { session_id: this.sessionId };
    return this.http.post(`${this.baseUrl}/release-session`, data);
  }

  /**
   * Conferma la prenotazione definitiva
   */
  confirmBooking(
    bookingId: number, 
    flightId: number, 
    seatIds: number[], 
    passengers: PassengerData[]
  ): Observable<BookingConfirmationResponse> {
    const data = {
      booking_id: bookingId,
      flight_id: flightId,
      seat_ids: seatIds,
      passengers,
      session_id: this.sessionId
    };

    return this.http.post<BookingConfirmationResponse>(`${this.baseUrl}/confirm-booking`, data);
  }

  /**
   * Ottiene le prenotazioni temporanee della sessione corrente
   */
  getMyReservations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/my-reservations/${this.sessionId}`);
  }

  /**
   * Crea una prenotazione temporanea per i posti selezionati
   */
  createTemporaryReservation(flightId: number, seatIds: number[]): Observable<any> {
    const data = {
      flight_id: flightId,
      seat_ids: seatIds,
      session_id: this.sessionId
    };
    
    const headers = this.getHeaders();
    return this.http.post(`${environment.apiUrl}/seat-reservations/reserve`, data, { headers });
  }

  /**
   * Rilascia le prenotazioni temporanee
   */
  releaseTemporaryReservations(flightId?: number, seatIds?: number[]): Observable<any> {
    const data: any = {
      session_id: this.sessionId
    };
    
    if (flightId) data.flight_id = flightId;
    if (seatIds) data.seat_ids = seatIds;
    
    const headers = this.getHeaders();
    // Backend expects DELETE /api/seat-reservations/release with body
    return this.http.request('DELETE', `${environment.apiUrl}/seat-reservations/release`, {
      headers,
      body: data
    });
  }

  /**
   * Aggiunge un posto alla selezione corrente
   */
  addSeatToSelection(seat: FlightSeatMap): void {
    console.log('🎯 Adding seat to selection:', seat);
    const currentState = this.seatSelectionState.value;
    const existingIndex = currentState.selectedSeats.findIndex(s => s.seat_id === seat.seat_id);
    
    if (existingIndex === -1) {
      const newSelectedSeats = [...currentState.selectedSeats, seat];
      
      // Aggiorna lo stato locale
      this.seatSelectionState.next({
        ...currentState,
        selectedSeats: newSelectedSeats,
        passengers: this.adjustPassengersArray(newSelectedSeats.length, currentState.passengers)
      });

      // Crea prenotazione temporanea per questo posto
      if (seat.flight_id) {
        console.log('🔄 Creating temporary reservation for seat:', seat.seat_number);
        console.log('🔑 Token available:', !!localStorage.getItem('token'));
        
        this.createTemporaryReservation(seat.flight_id, [seat.seat_id]).subscribe({
          next: (response) => {
            console.log('✅ Temporary reservation created for seat', seat.seat_number, response);
          },
          error: (error) => {
            console.error('❌ Error creating temporary reservation:', error);
            // In caso di errore, rimuovi il posto dalla selezione
            this.removeSeatFromSelection(seat.seat_id);
          }
        });
      }
    }
  }

  /**
   * Rimuove un posto dalla selezione corrente
   */
  removeSeatFromSelection(seatId: number): void {
    const currentState = this.seatSelectionState.value;
    const seatToRemove = currentState.selectedSeats.find(s => s.seat_id === seatId);
    const newSelectedSeats = currentState.selectedSeats.filter(s => s.seat_id !== seatId);
    
    // Aggiorna lo stato locale
    this.seatSelectionState.next({
      ...currentState,
      selectedSeats: newSelectedSeats,
      passengers: this.adjustPassengersArray(newSelectedSeats.length, currentState.passengers)
    });

    // Rilascia prenotazione temporanea per questo posto
    if (seatToRemove && seatToRemove.flight_id) {
      this.releaseTemporaryReservations(seatToRemove.flight_id, [seatId]).subscribe({
        next: (response) => {
          console.log('✅ Temporary reservation released for seat', seatToRemove.seat_number);
        },
        error: (error) => {
          console.error('❌ Error releasing temporary reservation:', error);
        }
      });
    }
  }

  /**
   * Aggiusta l'array dei passeggeri in base al numero di posti selezionati
   */
  private adjustPassengersArray(seatCount: number, currentPassengers: PassengerData[]): PassengerData[] {
    const passengers = [...currentPassengers];
    
    // Aggiungi passeggeri se necessario
    while (passengers.length < seatCount) {
      passengers.push({
        name: '',
        email: '',
        phone: '',
        document_type: 'passport',
        document_number: '',
        date_of_birth: '',
        nationality: ''
      });
    }
    
    // Rimuovi passeggeri in eccesso
    return passengers.slice(0, seatCount);
  }

  /**
   * Aggiorna i dati di un passeggero
   */
  updatePassenger(index: number, passenger: PassengerData): void {
    const currentState = this.seatSelectionState.value;
    const passengers = [...currentState.passengers];
    passengers[index] = passenger;
    
    this.seatSelectionState.next({
      ...currentState,
      passengers
    });
  }

  /**
   * Imposta la scadenza della prenotazione e avvia il countdown
   */
  setReservationExpiry(expiryDate: Date): void {
    const currentState = this.seatSelectionState.value;
    this.seatSelectionState.next({
      ...currentState,
      reservationExpires: expiryDate
    });

    this.startCountdown(expiryDate);
  }

  /**
   * Avvia il countdown per la scadenza
   */
  private startCountdown(expiryDate: Date): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }

    this.countdownSubscription = interval(1000).subscribe(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiryDate).getTime();
      const remaining = Math.max(0, expiry - now);
      
      this.countdownSubject.next(Math.floor(remaining / 1000));
      
      if (remaining <= 0) {
        this.onReservationExpired();
      }
    });
  }

  /**
   * Gestisce la scadenza della prenotazione
   */
  private onReservationExpired(): void {
    this.clearSelection();
    this.countdownSubscription?.unsubscribe();
    // Qui potresti emettere un evento o mostrare una notifica
  }

  /**
   * Cancella la selezione corrente
   */
  clearSelection(): void {
    this.releaseAllReservations().subscribe();
    this.seatSelectionState.next({
      selectedSeats: [],
      sessionId: this.sessionId,
      passengers: []
    });
    this.countdownSubscription?.unsubscribe();
    this.countdownSubject.next(0);
  }

  /**
   * Svuota SOLO lo stato locale di selezione senza rilasciare le prenotazioni lato backend.
   * Utile quando si passa dal primo al secondo segmento di un volo con scalo.
   */
  resetLocalSelection(): void {
    const current = this.seatSelectionState.value;
    this.seatSelectionState.next({
      selectedSeats: [],
      sessionId: current.sessionId || this.sessionId,
      passengers: []
    });
    this.countdownSubscription?.unsubscribe();
    this.countdownSubject.next(0);
  }

  /**
   * Ottiene lo stato corrente della selezione
   */
  getCurrentSelection(): SeatSelectionState {
    return this.seatSelectionState.value;
  }

  /**
   * Genera un nuovo session ID (utile per reset)
   */
  resetSession(): void {
    this.releaseAllReservations().subscribe();
    this.sessionId = this.generateSessionId();
    this.updateSessionId(this.sessionId);
    this.clearSelection();
  }

  /**
   * Controlla se l'utente corrente è una compagnia aerea
   */
  isAirlineUser(): boolean {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return false;
      
      const user = JSON.parse(userStr);
      return user.role === 'airline';
    } catch (error) {
      console.error('Errore nel controllo ruolo utente:', error);
      return false;
    }
  }

  /**
   * Controlla se l'utente è loggato
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Ottieni dati utente corrente
   */
  getCurrentUser(): any {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Errore nel recupero dati utente:', error);
      return null;
    }
  }

  /**
   * Richiede al backend di associare le prenotazioni temporanee della session guest all'utente autenticato
   */
  claimGuestReservations(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${environment.apiUrl}/seat-reservations/claim`, {
      session_id: this.sessionId
    }, { headers });
  }

  ngOnDestroy(): void {
    this.countdownSubscription?.unsubscribe();
  }
}
