// Modelli TypeScript per la gestione dei posti

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

export interface TemporarySeatReservation {
  id: number;
  flight_id: number;
  seat_id: number;
  session_id: string;
  user_id?: number;
  expires_at: Date;
  created_at: Date;
}

export interface SeatBooking {
  id: number;
  booking_id: number;
  flight_id: number;
  seat_id: number;
  passenger_name: string;
  passenger_email?: string;
  passenger_phone?: string;
  passenger_document_type: 'passport' | 'id_card' | 'driving_license';
  passenger_document_number?: string;
  passenger_date_of_birth?: Date;
  passenger_nationality?: string;
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
  seat_status: 'available' | 'temporarily_reserved' | 'booked';
  reserved_by_session?: string;
  reservation_expires?: Date;
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

export interface SeatReservationRequest {
  flight_id: number;
  seat_id: number;
  session_id: string;
  user_id?: number;
}

export interface SeatBookingRequest {
  booking_id: number;
  flight_id: number;
  seat_ids: number[];
  passengers: PassengerData[];
  session_id: string;
}

export interface SeatSelectionState {
  selectedSeats: number[];
  reservationExpires?: Date;
  sessionId: string;
}
