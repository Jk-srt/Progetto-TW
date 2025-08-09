import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FlightConnection } from './flight-connection.service';

export interface MultiSegmentBooking {
  connection: FlightConnection;
  segments: MultiSegmentFlightData[];
  currentSegmentIndex: number;
  isActive: boolean;
}

export interface MultiSegmentFlightData {
  flightNumber: string;
  flightId: number;
  route: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  completed: boolean;
  selectedSeats?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class MultiSegmentBookingService {
  private currentBookingSubject = new BehaviorSubject<MultiSegmentBooking | null>(null);
  public currentBooking$ = this.currentBookingSubject.asObservable();

  constructor() {}

  startMultiSegmentBooking(connection: FlightConnection): void {
    const segments: MultiSegmentFlightData[] = [
      {
        flightNumber: connection.outboundFlight.flight_number || '',
        flightId: connection.outboundFlight.id,
        route: `${connection.outboundFlight.departure_city} → ${connection.outboundFlight.arrival_city}`,
        departure: connection.outboundFlight.departure_city || '',
        arrival: connection.outboundFlight.arrival_city || '',
        departureTime: connection.outboundFlight.departure_time || '',
        arrivalTime: connection.outboundFlight.arrival_time || '',
        price: connection.outboundFlight.price || 0,
        completed: false
      },
      {
        flightNumber: connection.connectionFlight?.flight_number || '',
        flightId: connection.connectionFlight?.id || 0,
        route: `${connection.connectionFlight?.departure_city} → ${connection.connectionFlight?.arrival_city}`,
        departure: connection.connectionFlight?.departure_city || '',
        arrival: connection.connectionFlight?.arrival_city || '',
        departureTime: connection.connectionFlight?.departure_time || '',
        arrivalTime: connection.connectionFlight?.arrival_time || '',
        price: connection.connectionFlight?.price || 0,
        completed: false
      }
    ];

    const booking: MultiSegmentBooking = {
      connection,
      segments,
      currentSegmentIndex: 0,
      isActive: true
    };

    this.currentBookingSubject.next(booking);
    console.log('🔗 Multi-segment booking avviata:', booking);
  }

  getCurrentBooking(): MultiSegmentBooking | null {
    return this.currentBookingSubject.value;
  }

  updateSegment(segmentIndex: number, updatedData: Partial<MultiSegmentFlightData>): void {
    const currentBooking = this.getCurrentBooking();
    if (!currentBooking) return;

    currentBooking.segments[segmentIndex] = {
      ...currentBooking.segments[segmentIndex],
      ...updatedData
    };

    this.currentBookingSubject.next(currentBooking);
    console.log(`🔄 Segmento ${segmentIndex} aggiornato:`, currentBooking.segments[segmentIndex]);
  }

  completeSegment(segmentIndex: number, selectedSeats: any[]): void {
    this.updateSegment(segmentIndex, {
      completed: true,
      selectedSeats
    });
  }

  moveToNextSegment(): boolean {
    const currentBooking = this.getCurrentBooking();
    if (!currentBooking) return false;

    if (currentBooking.currentSegmentIndex < currentBooking.segments.length - 1) {
      currentBooking.currentSegmentIndex++;
      this.currentBookingSubject.next(currentBooking);
      return true;
    }

    return false;
  }

  isAllSegmentsCompleted(): boolean {
    const currentBooking = this.getCurrentBooking();
    if (!currentBooking) return false;

    return currentBooking.segments.every(segment => segment.completed);
  }

  getTotalPrice(): number {
    const currentBooking = this.getCurrentBooking();
    if (!currentBooking) return 0;

    return currentBooking.segments.reduce((total, segment) => {
      const segmentPrice = segment.price || 0;
      const seatsPrice = segment.selectedSeats?.reduce((seatTotal: number, seat: any) => 
        seatTotal + (seat.price || 0), 0) || 0;
      return total + segmentPrice + seatsPrice;
    }, 0);
  }

  clearBooking(): void {
    this.currentBookingSubject.next(null);
    console.log('🧹 Multi-segment booking cancellata');
  }

  getCheckoutData(): any {
    const currentBooking = this.getCurrentBooking();
    if (!currentBooking) return null;

    return {
      isMultiSegment: true,
      connection: currentBooking.connection,
      segments: currentBooking.segments,
      totalPrice: this.getTotalPrice(),
      flightIds: currentBooking.segments.map(s => s.flightId),
      selectedSeats: currentBooking.segments.flatMap(s => s.selectedSeats || [])
    };
  }
}
