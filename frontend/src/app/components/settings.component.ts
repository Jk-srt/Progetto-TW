import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <h1>Impostazioni</h1>
        <p>Gestisci le tue preferenze</p>
      </div>
      
      <div class="settings-content">
        <div class="settings-card">
          <h2>Configurazione account</h2>
          <div class="settings-section">
            <div class="setting-item">
              <div class="setting-info">
                <h3>Notifiche email</h3>
                <p>Ricevi aggiornamenti sui tuoi voli via email</p>
              </div>
              <label class="toggle">
                <input type="checkbox" checked>
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <h3>Notifiche SMS</h3>
                <p>Ricevi promemoria e aggiornamenti via SMS</p>
              </div>
              <label class="toggle">
                <input type="checkbox">
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <h3>Newsletter</h3>
                <p>Ricevi offerte speciali e promozioni</p>
              </div>
              <label class="toggle">
                <input type="checkbox" checked>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="settings-card">
          <h2>Privacy e sicurezza</h2>
          <div class="settings-section">
            <button class="action-button secondary">
              Scarica i miei dati
            </button>
            <button class="action-button danger">
              Elimina account
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .settings-header {
      text-align: center;
      margin-bottom: 3rem;
      color: white;
    }

    .settings-header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .settings-header p {
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .settings-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .settings-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .settings-card h2 {
      color: #333;
      margin-bottom: 1.5rem;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-info h3 {
      color: #333;
      margin-bottom: 0.25rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .setting-info p {
      color: #666;
      font-size: 0.9rem;
      margin: 0;
    }

    .toggle {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #667eea;
    }

    input:checked + .slider:before {
      transform: translateX(26px);
    }

    .action-button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 150px;
      text-align: left;
    }

    .action-button.secondary {
      background: #f8f9fa;
      color: #333;
      border: 1px solid #e9ecef;
    }

    .action-button.secondary:hover {
      background: #e9ecef;
    }

    .action-button.danger {
      background: #fff5f5;
      color: #dc3545;
      border: 1px solid #f5c6cb;
    }

    .action-button.danger:hover {
      background: #f8d7da;
    }

    @media (max-width: 768px) {
      .settings-header h1 {
        font-size: 2rem;
      }
      
      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .toggle {
        align-self: flex-end;
      }
    }
  `]
})
export class SettingsComponent {}
