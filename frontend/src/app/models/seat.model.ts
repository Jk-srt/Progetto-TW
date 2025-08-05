// Modelli per la gestione dei posti nel frontend Angular

export interface AircraftSeat {
  id: number;
  aircraft_id: number;
  seat_number: string;
  seat_row: number;
  seat_column: string;
  seat_class: 'economy' | 'business' | 'first';
  is_window: boolean;
  is_aisle: boolean;
  is_emergency_exit: boolean;
  created_at: Date;
}

export interface FlightSeatMap {
  flight_id: number;
  flight_number: string;
  aircraft_id: number;
  aircraft_type: string;
  seat_capacity: number;
  seat_id: number;
  seat_number: string;
  seat_class: string;
  seat_row: number;
  seat_column: string;
  is_window: boolean;
  is_aisle: boolean;
  is_emergency_exit: boolean;
  seat_status: 'available' | 'temporarily_reserved' | 'booked' | 'occupied';
  actual_status?: 'available' | 'temporarily_reserved' | 'my_reservation' | 'occupied';
  reservation_expires?: Date;
  is_my_reservation?: boolean;
  reservation_session?: string;
  reserved_by_session?: string;
  booked_by_passenger?: string;
}

export interface PassengerData {
  name: string;
  email?: string;
  phone?: string;
  document_type: 'passport' | 'id_card' | 'driving_license';
  document_number?: string;
  date_of_birth?: string;
  nationality?: string;
}

export interface SeatSelectionState {
  selectedSeats: FlightSeatMap[];
  reservationExpires?: Date;
  sessionId: string;
  passengers: PassengerData[];
}

export interface SeatReservationResponse {
  success: boolean;
  message: string;
  reservation_expires?: Date;
  seat_id?: number;
  flight_id?: number;
}

export interface SeatMapResponse {
  success: boolean;
  sessionId: string;
  flightId: number;
  seats: FlightSeatMap[];
}

export interface BookingConfirmationResponse {
  success: boolean;
  message: string;
  booking_id?: number;
  confirmed_seats?: {
    seat_id: number;
    passenger_name: string;
  }[];
}
