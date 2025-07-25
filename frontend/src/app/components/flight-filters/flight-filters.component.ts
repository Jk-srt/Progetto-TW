import { Component, Input, Output, EventEmitter } from '@angular/core';

export type FilterType = 'all' | 'departures' | 'arrivals';

@Component({
  selector: 'app-flight-filters',
  standalone: true,
  template: `
    <div class="section-header">
      <h2>{{title}}</h2>
      <div class="filters">
        <button 
          class="filter-btn" 
          [class.active]="selectedFilter === 'all'"
          (click)="onFilterChange('all')">
          Tutti
        </button>
        <button 
          class="filter-btn" 
          [class.active]="selectedFilter === 'departures'"
          (click)="onFilterChange('departures')">
          Partenze
        </button>
        <button 
          class="filter-btn" 
          [class.active]="selectedFilter === 'arrivals'"
          (click)="onFilterChange('arrivals')">
          Arrivi
        </button>
      </div>
    </div>
  `,
  styleUrl: './flight-filters.component.scss'
})
export class FlightFiltersComponent {
  @Input() title: string = 'Voli in Programmazione';
  @Input() selectedFilter: FilterType = 'all';
  @Output() filterChange = new EventEmitter<FilterType>();

  onFilterChange(filter: FilterType) {
    this.filterChange.emit(filter);
  }
}
