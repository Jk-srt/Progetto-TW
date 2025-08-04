import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      <div 
        *ngFor="let notification of notifications; trackBy: trackByFn"
        class="notification"
        [class]="'notification-' + notification.type"
        [@fadeInOut]>
        
        <div class="notification-content">
          <div class="notification-icon" *ngIf="notification.showIcon">
            {{ getIcon(notification.type) }}
          </div>
          
          <div class="notification-text">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message" *ngIf="notification.message">
              {{ notification.message }}
            </div>
          </div>
          
          <button 
            class="notification-close"
            (click)="removeNotification(notification.id)"
            aria-label="Chiudi notifica">
            ×
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      pointer-events: none;
    }

    .notification {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      margin-bottom: 10px;
      overflow: hidden;
      pointer-events: auto;
      transition: all 0.3s ease;
      border-left: 4px solid #ccc;
    }

    .notification-success {
      border-left-color: #28a745;
    }

    .notification-error {
      border-left-color: #dc3545;
    }

    .notification-warning {
      border-left-color: #ffc107;
    }

    .notification-info {
      border-left-color: #17a2b8;
    }

    .notification-content {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      gap: 12px;
    }

    .notification-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .notification-success .notification-icon {
      color: #28a745;
    }

    .notification-error .notification-icon {
      color: #dc3545;
    }

    .notification-warning .notification-icon {
      color: #ffc107;
    }

    .notification-info .notification-icon {
      color: #17a2b8;
    }

    .notification-text {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .notification-message {
      color: #666;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-line;
    }

    .notification-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .notification-close:hover {
      background: #f8f9fa;
      color: #666;
    }

    @keyframes fadeInOut {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .notification {
      animation: fadeInOut 0.3s ease;
    }

    @media (max-width: 480px) {
      .notifications-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
      
      .notification-content {
        padding: 12px;
      }
    }
  `],
  animations: []
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(
      (notifications) => {
        this.notifications = notifications;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  trackByFn(index: number, item: Notification): string {
    return item.id;
  }
}
