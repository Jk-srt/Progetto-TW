import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="home-container">
      <h1>Benvenuto nel sistema di prenotazione voli!</h1>
      <p>Utilizza la barra di navigazione per cercare voli, acquistare biglietti o accedere al tuo profilo.</p>
      <div class="home-actions">
        <a routerLink="/search" class="btn">Cerca Voli</a>
        <a routerLink="/purchase" class="btn">Acquista Biglietto</a>
        <a routerLink="/login" class="btn">Login Utente</a>
      </div>
    </div>
  `,
  styles: [`
    .home-container { text-align: center; margin-top: 40px; }
    .home-actions { margin-top: 30px; }
    .btn { margin: 0 10px; padding: 10px 20px; background: #1976d2; color: #fff; border-radius: 4px; text-decoration: none; }
    .btn:hover { background: #1565c0; }
  `]
})
export class HomeComponent {}
