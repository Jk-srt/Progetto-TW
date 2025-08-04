import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  showIcon?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() {}

  showNotification(notification: Omit<Notification, 'id'>): void {
    const id = this.generateId();
    const newNotification: Notification = {
      id,
      duration: 5000, // 5 secondi di default
      showIcon: true,
      ...notification
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, newNotification]);

    // Auto-remove dopo la durata specificata
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, newNotification.duration);
    }
  }

  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(filteredNotifications);
  }

  // Metodi di convenienza
  showSuccess(title: string, message: string, duration?: number): void {
    this.showNotification({
      type: 'success',
      title,
      message,
      duration
    });
  }

  showError(title: string, message: string, duration?: number): void {
    this.showNotification({
      type: 'error',
      title,
      message,
      duration: duration || 8000 // Gli errori durano di più
    });
  }

  showWarning(title: string, message: string, duration?: number): void {
    this.showNotification({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  showInfo(title: string, message: string, duration?: number): void {
    this.showNotification({
      type: 'info',
      title,
      message,
      duration
    });
  }

  // Metodo speciale per notifica di booking con email
  showBookingSuccess(bookingReference: string, email: string): void {
    this.showNotification({
      type: 'success',
      title: '✅ Prenotazione Confermata!',
      message: `Codice prenotazione: ${bookingReference}\n📧 Biglietto inviato a: ${email}\n\nControlla la tua casella email per i dettagli del volo.`,
      duration: 10000 // 10 secondi per leggere bene
    });
  }

  clearAll(): void {
    this.notificationsSubject.next([]);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
