import { Component } from '@angular/core';

@Component({
  selector: 'app-welcome-section',
  standalone: true,
  template: `
    <div class="welcome-section">
      <div class="welcome-content">
        <h1>Benvenuto nel Sistema di Gestione Voli</h1>
        <p>Monitora i voli in tempo reale e gestisci le prenotazioni con facilità</p>
      </div>
    </div>
  `,
  styleUrl: './welcome-section.component.scss'
})
export class WelcomeSectionComponent {
}
