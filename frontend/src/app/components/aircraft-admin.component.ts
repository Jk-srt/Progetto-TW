import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-aircraft-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="aircraft-admin-container">
      <div class="admin-header">
        <h1>Gestione Aeromobili</h1>
        <p>Amministrazione completa degli aeromobili della flotta</p>
      </div>
      
      <div class="maintenance-message">
        <h2>Componente in manutenzione</h2>
        <p>Questo componente verrà ripristinato presto.</p>
      </div>
    </div>
  `,
  styles: [`
    .aircraft-admin-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    .admin-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .admin-header h1 {
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }
    
    .maintenance-message {
      text-align: center;
      padding: 2rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }
    
    .maintenance-message h2 {
      color: #6c757d;
      margin-bottom: 1rem;
    }
    
    .maintenance-message p {
      color: #6c757d;
    }
  `]
})
export class AircraftAdminComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    console.log('AircraftAdminComponent initialized');
  }
}
