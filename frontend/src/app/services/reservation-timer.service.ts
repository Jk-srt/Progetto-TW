import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

interface ReservationTimer {
  sessionId: string;
  expiresAt: number;
  seatIds: number[];
  renewed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationTimerService {
  private timers = new Map<string, ReservationTimer>();
  private timerSubscription?: Subscription;
  private activeTimer$ = new BehaviorSubject<ReservationTimer | null>(null);
  
  public currentTimer = this.activeTimer$.asObservable();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    this.startGlobalTimer();
  }

  startReservationTimer(sessionId: string, seatIds: number[], durationMinutes: number = 15): void {
    const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
    
    const timer: ReservationTimer = {
      sessionId,
      expiresAt,
      seatIds,
      renewed: false
    };

    this.timers.set(sessionId, timer);
    this.activeTimer$.next(timer);
    
    console.log(`⏰ Started reservation timer for session ${sessionId}, expires at ${new Date(expiresAt)}`);
  }

  extendReservationTimer(sessionId: string, extraMinutes: number = 15): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      timer.expiresAt = Date.now() + (extraMinutes * 60 * 1000);
      timer.renewed = true;
      this.timers.set(sessionId, timer);
      this.activeTimer$.next(timer);
      
      console.log(`🔄 Extended reservation timer for session ${sessionId}`);
    }
  }

  getTimeRemaining(sessionId: string): number {
    const timer = this.timers.get(sessionId);
    if (!timer) return 0;
    
    const remaining = timer.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }

  isReservationActive(sessionId: string): boolean {
    return this.getTimeRemaining(sessionId) > 0;
  }

  clearReservationTimer(sessionId: string): void {
    this.timers.delete(sessionId);
    this.activeTimer$.next(null);
    console.log(`🗑️ Cleared reservation timer for session ${sessionId}`);
  }

  private startGlobalTimer(): void {
    // Controlla ogni secondo tutti i timer attivi
    this.timerSubscription = interval(1000).subscribe(() => {
      const now = Date.now();
      
      for (const [sessionId, timer] of this.timers.entries()) {
        const timeRemaining = Math.floor((timer.expiresAt - now) / 1000);
        
        // Notifica a 2 minuti dalla scadenza
        if (timeRemaining === 120 && !timer.renewed) {
          this.notificationService.showWarning(
            '⏰ Attenzione!',
            'La prenotazione scadrà tra 2 minuti. Completa rapidamente la prenotazione.',
            8000
          );
        }
        
        // Tentativo di rinnovo automatico a 3 minuti dalla scadenza
        if (timeRemaining === 180 && !timer.renewed) {
          this.attemptAutoRenewal(sessionId, timer);
        }
        
        // Notifica finale a 30 secondi
        if (timeRemaining === 30) {
          this.notificationService.showError(
            '🚨 Ultimo avviso!',
            'La prenotazione scadrà tra 30 secondi!',
            10000
          );
        }
        
        // Timer scaduto
        if (timeRemaining <= 0) {
          this.handleExpiredReservation(sessionId, timer);
        }
      }
    });
  }

  private attemptAutoRenewal(sessionId: string, timer: ReservationTimer): void {
    console.log('🔄 Attempting auto-renewal for session:', sessionId);
    
    const headers = this.getAuthHeaders();
    
    this.http.post(`${environment.apiUrl}/seats/renew-reservation`, {
      seat_ids: timer.seatIds,
      session_id: sessionId
    }, { headers }).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.extendReservationTimer(sessionId, 15);
          this.notificationService.showSuccess(
            '🔄 Prenotazione Rinnovata',
            'La prenotazione è stata automaticamente rinnovata per altri 15 minuti.',
            5000
          );
        }
      },
      error: (error) => {
        console.error('❌ Auto-renewal failed:', error);
        timer.renewed = true; // Evita ulteriori tentativi
        this.notificationService.showWarning(
          '⚠️ Impossibile Rinnovare',
          'Non è stato possibile rinnovare automaticamente la prenotazione. Completa rapidamente l\'acquisto.',
          8000
        );
      }
    });
  }

  private handleExpiredReservation(sessionId: string, timer: ReservationTimer): void {
    console.log('⏰ Reservation expired for session:', sessionId);
    
    this.notificationService.showError(
      '⏰ Prenotazione Scaduta',
      'Il tempo per completare la prenotazione è scaduto. I posti sono stati rilasciati.',
      10000
    );
    
    // Rilascia i posti sul server
    this.releaseExpiredReservation(sessionId, timer.seatIds);
    
    // Rimuovi il timer
    this.clearReservationTimer(sessionId);
  }

  private releaseExpiredReservation(sessionId: string, seatIds: number[]): void {
    const headers = this.getAuthHeaders();
    
    this.http.post(`${environment.apiUrl}/seats/release-expired`, {
      seat_ids: seatIds,
      session_id: sessionId
    }, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Expired reservation released on server');
      },
      error: (error) => {
        console.error('❌ Failed to release expired reservation:', error);
      }
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
}
