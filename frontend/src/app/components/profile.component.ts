import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar-large">
            {{ getUserInitials() }}
          </div>
          <div class="profile-details">
            <h1>{{ getUserFullName() }}</h1>
            <p class="profile-email">{{ currentUser?.email }}</p>
          </div>
        </div>
        
        <div class="profile-sections">
          <div class="profile-section">
            <h2>Informazioni personali</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Nome</label>
                <span>{{ currentUser?.first_name || 'Non specificato' }}</span>
              </div>
              <div class="info-item">
                <label>Cognome</label>
                <span>{{ currentUser?.last_name || 'Non specificato' }}</span>
              </div>
              <div class="info-item">
                <label>Email</label>
                <span>{{ currentUser?.email }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .profile-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .profile-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .profile-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 600;
      border: 3px solid rgba(255, 255, 255, 0.3);
    }

    .profile-details h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .profile-email {
      margin: 0.5rem 0 0 0;
      opacity: 0.9;
      font-size: 1rem;
    }

    .profile-sections {
      padding: 2rem;
    }

    .profile-section {
      margin-bottom: 2rem;
    }

    .profile-section h2 {
      color: #333;
      margin-bottom: 1rem;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .info-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .info-item label {
      font-weight: 600;
      color: #666;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-item span {
      color: #333;
      font-size: 1rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #e9ecef;
    }

    @media (max-width: 768px) {
      .profile-header {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  currentUser: any = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
  }

  getUserInitials(): string {
    return this.authService.getUserInitials();
  }

  getUserFullName(): string {
    return this.authService.getUserFullName();
  }
}
