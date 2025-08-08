import { Injectable } from '@angular/core';
import { FlightSeatMap, SeatSelectionState } from '../models/seat.model';

@Injectable({
  providedIn: 'root'
})
export class SeatPersistenceService {
  private readonly STORAGE_KEY = 'seat_selection_state';
  private readonly EXPIRY_MINUTES = 15; // Scadenza dopo 15 minuti

  saveSelectionState(state: SeatSelectionState): void {
    try {
      const dataToSave = {
        ...state,
        timestamp: Date.now(),
        expiresAt: Date.now() + (this.EXPIRY_MINUTES * 60 * 1000)
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('💾 Selection state saved to localStorage');
    } catch (error) {
      console.error('❌ Failed to save selection state:', error);
    }
  }

  loadSelectionState(): SeatSelectionState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      
      // Controlla se è scaduto
      if (Date.now() > data.expiresAt) {
        console.log('⏰ Stored selection state expired, clearing...');
        this.clearSelectionState();
        return null;
      }

      console.log('📁 Selection state loaded from localStorage');
      return {
        selectedSeats: data.selectedSeats || [],
        sessionId: data.sessionId || '',
        passengers: data.passengers || []
      };
    } catch (error) {
      console.error('❌ Failed to load selection state:', error);
      return null;
    }
  }

  clearSelectionState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Selection state cleared from localStorage');
    } catch (error) {
      console.error('❌ Failed to clear selection state:', error);
    }
  }

  getTimeRemaining(): number {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return 0;

      const data = JSON.parse(stored);
      const remaining = data.expiresAt - Date.now();
      
      return remaining > 0 ? Math.floor(remaining / 1000) : 0;
    } catch (error) {
      console.error('❌ Failed to get time remaining:', error);
      return 0;
    }
  }

  // Salva configurazione aereo per session
  saveAircraftConfig(flightId: number, config: any): void {
    try {
      const key = `aircraft_config_${flightId}`;
      sessionStorage.setItem(key, JSON.stringify(config));
    } catch (error) {
      console.error('❌ Failed to save aircraft config:', error);
    }
  }

  loadAircraftConfig(flightId: number): any | null {
    try {
      const key = `aircraft_config_${flightId}`;
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Failed to load aircraft config:', error);
      return null;
    }
  }
}
