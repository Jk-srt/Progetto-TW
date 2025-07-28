import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bookings-container">
      <div class="bookings-header">
        <h1>Le mie prenotazioni</h1>
        <p>Gestisci tutte le tue prenotazioni voli</p>
      </div>
      
      <div class="bookings-content">
        <div class="empty-state">
          <div class="empty-icon">✈️</div>
          <h2>Nessuna prenotazione trovata</h2>
          <p>Quando effettuerai delle prenotazioni, le vedrai qui.</p>
          <button class="cta-button" routerLink="/">
            Cerca voli
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bookings-container {
      max-width: 1000px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .bookings-header {
      text-align: center;
      margin-bottom: 3rem;
      color: white;
    }

    .bookings-header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .bookings-header p {
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .bookings-content {
      background: white;
      border-radius: 12px;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      color: #333;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 2rem;
      font-size: 1rem;
    }

    .cta-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
      text-decoration: none;
      display: inline-block;
    }

    .cta-button:hover {
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .bookings-header h1 {
        font-size: 2rem;
      }
      
      .empty-state {
        padding: 2rem 1rem;
      }
    }
  `]
})
export class BookingsComponent {}
