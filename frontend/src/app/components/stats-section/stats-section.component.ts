import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatCard {
  icon: string;
  number: number;
  label: string;
}

@Component({
  selector: 'app-stats-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-section">
      <div class="stat-card" *ngFor="let stat of stats">
        <div class="stat-icon">{{stat.icon}}</div>
        <div class="stat-number">{{stat.number}}</div>
        <div class="stat-label">{{stat.label}}</div>
      </div>
    </div>
  `,
  styleUrl: './stats-section.component.scss'
})
export class StatsSectionComponent {
  @Input() stats: StatCard[] = [];
}
