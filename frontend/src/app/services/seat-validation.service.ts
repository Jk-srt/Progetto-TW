import { Injectable } from '@angular/core';
import { FlightSeatMap } from '../models/seat.model';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface PassengerInfo {
  age?: number;
  hasInfant?: boolean;
  hasDisability?: boolean;
  emergencyAssist?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SeatValidationService {

  validateSeatSelection(
    seat: FlightSeatMap, 
    passenger?: PassengerInfo
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validazione posti di emergenza
    if (seat.is_emergency_exit) {
      const emergencyValidation = this.validateEmergencyExit(seat, passenger);
      result.errors.push(...emergencyValidation.errors);
      result.warnings.push(...emergencyValidation.warnings);
    }

    // Validazione età per alcuni posti
    if (passenger?.age !== undefined) {
      const ageValidation = this.validateAgeRestrictions(seat, passenger.age);
      result.errors.push(...ageValidation.errors);
      result.warnings.push(...ageValidation.warnings);
    }

    // Validazione disabilità
    if (passenger?.hasDisability) {
      const disabilityValidation = this.validateAccessibility(seat);
      result.errors.push(...disabilityValidation.errors);
      result.warnings.push(...disabilityValidation.warnings);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateEmergencyExit(
    seat: FlightSeatMap, 
    passenger?: PassengerInfo
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!passenger) {
      result.warnings.push('⚠️ I posti di emergenza richiedono passeggeri idonei');
      return result;
    }

    // Età minima per posti di emergenza: 15 anni
    if (passenger.age !== undefined && passenger.age < 15) {
      result.errors.push('❌ I passeggeri sotto i 15 anni non possono occupare posti di emergenza');
    }

    // Età massima consigliata: 65 anni
    if (passenger.age !== undefined && passenger.age > 65) {
      result.warnings.push('⚠️ I posti di emergenza sono sconsigliati per passeggeri over 65');
    }

    // Non può avere bambini in braccio
    if (passenger.hasInfant) {
      result.errors.push('❌ I posti di emergenza non consentono passeggeri con bambini in braccio');
    }

    // Non può avere disabilità che impediscono assistenza
    if (passenger.hasDisability && !passenger.emergencyAssist) {
      result.errors.push('❌ I posti di emergenza richiedono capacità di assistere in caso di emergenza');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateAgeRestrictions(seat: FlightSeatMap, age: number): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Business/First class suggerita per bambini piccoli
    if (age < 2 && seat.seat_class === 'economy') {
      result.warnings.push('💼 Considera Business Class per maggiore comfort con bambini piccoli');
    }

    // Finestrino sconsigliato per bambini molto piccoli
    if (age < 5 && seat.is_window) {
      result.warnings.push('🪟 I posti finestrino possono essere scomodi per bambini piccoli');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateAccessibility(seat: FlightSeatMap): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Corridoio consigliato per mobilità ridotta
    if (!seat.is_aisle) {
      result.warnings.push('🚶 I posti corridoio sono consigliati per passeggeri con mobilità ridotta');
    }

    // Business class consigliata
    if (seat.seat_class === 'economy') {
      result.warnings.push('💼 Business Class offre maggiore spazio per passeggeri con esigenze speciali');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  // Validazione gruppo (famiglia, coppie)
  validateGroupSeating(seats: FlightSeatMap[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (seats.length < 2) return result;

    const rows = [...new Set(seats.map(s => s.seat_row))];
    const classes = [...new Set(seats.map(s => s.seat_class))];

    // Avvisa se i posti sono in righe diverse
    if (rows.length > 2) {
      result.warnings.push('👨‍👩‍👧‍👦 I posti selezionati sono distribuiti su più righe');
    }

    // Avvisa se ci sono classi diverse
    if (classes.length > 1) {
      result.warnings.push('🎫 I posti selezionati sono in classi diverse');
    }

    // Controlla continuità dei posti
    const continuousSeats = this.checkSeatContinuity(seats);
    if (!continuousSeats && seats.length > 2) {
      result.warnings.push('📍 I posti non sono adiacenti');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private checkSeatContinuity(seats: FlightSeatMap[]): boolean {
    if (seats.length < 2) return true;

    // Ordina per riga e colonna
    const sortedSeats = seats.sort((a, b) => {
      if (a.seat_row !== b.seat_row) {
        return a.seat_row - b.seat_row;
      }
      return a.seat_column.localeCompare(b.seat_column);
    });

    // Controlla continuità
    for (let i = 1; i < sortedSeats.length; i++) {
      const current = sortedSeats[i];
      const previous = sortedSeats[i - 1];

      // Stessa riga?
      if (current.seat_row === previous.seat_row) {
        const currentCol = current.seat_column.charCodeAt(0);
        const previousCol = previous.seat_column.charCodeAt(0);
        
        // Colonne consecutive?
        if (currentCol - previousCol !== 1) {
          return false;
        }
      } else {
        // Righe diverse - considera break nel corridoio
        if (current.seat_row - previous.seat_row > 1) {
          return false;
        }
      }
    }

    return true;
  }

  // Suggerimenti automatici
  getSeatRecommendations(
    passenger: PassengerInfo,
    availableSeats: FlightSeatMap[]
  ): FlightSeatMap[] {
    let recommendations = [...availableSeats];

    // Filtra posti di emergenza se non idoneo
    if (passenger.age !== undefined && passenger.age < 15) {
      recommendations = recommendations.filter(seat => !seat.is_emergency_exit);
    }

    // Preferisci corridoio per disabilità
    if (passenger.hasDisability) {
      const aisleSeats = recommendations.filter(seat => seat.is_aisle);
      if (aisleSeats.length > 0) {
        recommendations = aisleSeats;
      }
    }

    // Preferisci finestrino per bambini (ma non troppo piccoli)
    if (passenger.age !== undefined && passenger.age >= 5 && passenger.age <= 12) {
      const windowSeats = recommendations.filter(seat => seat.is_window);
      if (windowSeats.length > 0) {
        recommendations = windowSeats;
      }
    }

    // Ordina per preferenza
    return recommendations.sort((a, b) => {
      // Business class prima
      if (a.seat_class !== b.seat_class) {
        const classOrder = { 'first': 3, 'business': 2, 'economy': 1 };
        return (classOrder[b.seat_class as keyof typeof classOrder] || 0) - 
               (classOrder[a.seat_class as keyof typeof classOrder] || 0);
      }

      // Righe anteriori prima
      return a.seat_row - b.seat_row;
    });
  }
}
