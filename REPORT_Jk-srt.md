# Report Individuale – Jk-srt

Nome File PDF (convenzione): Cognome_Nome_Matricola.pdf  
Matricola: __________________

## 1. Architettura del Sistema
Il sistema è una piattaforma di gestione voli e prenotazioni strutturata su un'architettura **client–server** con i seguenti blocchi principali:
- **Frontend Angular (SPA)**: componenti standalone, routing client-side, servizi per l’accesso alle API REST, gestione stato sessione JWT in `localStorage`, interceptor per allegare il token alle richieste protette.
- **Backend Node.js / Express + TypeScript**: esposizione delle API REST, middleware di autenticazione e autorizzazione (ruoli: admin, airline, user), orchestrazione prenotazioni e gestione posti, calcolo prezzi multi-tratta e per classe.
- **Database PostgreSQL**: schema relazionale ottimizzato con viste di supporto (`flights_with_airports`, `flight_seat_map`, `route_pricing_view`) e funzioni PL/pgSQL per logica lato DB (prenotazioni temporanee e conferme, cleanup).
- **Containerizzazione (Docker Compose)**: servizi `backend`, `frontend`, `database` (opzionale rispetto a Neon) su rete bridge, mount sorgenti per hot-reload backend, build ottimizzata frontend servito via Nginx.
- **Background Job**: scheduler (FlightStatusJob) per avanzamento automatico stati volo (scheduled → in_progress → completed) e gestione ritardi/cancellazioni (feature avanzata integrabile via flag env).

Flusso generale:
1. Utente / ospite cerca voli (diretti o con connessione) → API `/api/flights/search` e `/api/flights/connections` (pricing combinato + mapping città multilingua).
2. Selezione posto: prenotazione temporanea (hold 15 minuti) → conferma → generazione booking + seat_bookings.
3. Pagamento (placeholder) → conferma finale e riduzione `available_seats`.
4. Admin / Airline: gestione aerei, rotte, prezzi per classe e statistiche.
5. Aggiornamenti real-time (eventuale espandibile con WebSocket già predisposto lato server).

## 2. Modello Dati (Sintesi ER)
Entità principali:
- `airports(id, name, iata_code, city, country, …)`
- `airlines(id, name, iata_code, icao_code, active, …)`
- `aircrafts(id, airline_id, registration, seat_capacity, business_class_seats, economy_class_seats, …)`
- `routes(id, departure_airport_id, arrival_airport_id, distance_km, estimated_duration, default_price, status)` (vincolo unique coppia aeroporti)
- `flights(id, flight_number, airline_id, aircraft_id, route_id, departure_time, arrival_time, price, total_seats, available_seats, status)`
- `users(id, first_name, last_name, …)` (dati anagrafici passeggeri; separati da credenziali)
- `accesso(id, email, password_hash, role, airline_id?, user_id?)` con vincoli di coerenza per ruoli
- `bookings(id, user_id, flight_id, booking_reference, passenger_count, total_price, status, booking_status)`
- `route_pricing(route_id, seat_class, base_price)` (prezzi differenziati per classe)
- `aircraft_seats(aircraft_id, seat_number, seat_class, seat_type, …)`
- `temporary_seat_reservations(flight_id, seat_id, session_id, expires_at, user_id)`
- `seat_bookings(booking_id, flight_id, seat_id, passenger_name, …)`

Viste / Supporto:
- `flights_with_airports` per join consolidata voli + rotte + aeroporti.
- `flight_seat_map` stato dettagliato dei posti (available / temporarily_reserved / booked / unavailable).
- `route_pricing_view` aggregazione prezzi per classe.

Logica DB (funzioni): `reserve_seat_temporarily`, `release_seat_reservation`, `confirm_seat_booking`, `cleanup_expired_reservations` + trigger `cleanup_trigger`.

## 3. REST API (Overview sintetica)
Macro gruppi:
- Autenticazione / Accesso: `/api/auth/*` (login, airline login, gestione compagnie, verify, force-change-password)
- Voli: `/api/flights` (search, connections, stats, CRUD, pricing per volo, data helpers)
- Rotte: `/api/routes` (listing, per airline, analytics, CRUD)
- Aerei: `/api/aircrafts` (CRUD, check-registration, my-aircrafts)
- Prezzi rotta: `/api/route-pricing` (CRUD per seat_class)
- Utenti: `/api/users` (register, profile get/update, password change, profile-image, list, delete)
- Prenotazioni: `/api/bookings` (create, list user, list airline, delete)
- Selezione posti: `/api/seats` (flight seat map, reserve, release, confirm-booking, renew-reservation, release-expired, updates stream)
- Sistema avanzato legacy: `/api/seat-reservations` (vecchio endpoint parallelizzato)
- Admin: `/api/admin` (utenti)

Richieste tipiche (esempi JSON):
- POST /api/bookings
```json
{
  "flightId": 51,
  "passengers": [
    { "name": "Mario Rossi", "seatId": 123, "documentType": "passport" }
  ],
  "paymentMethod": "card"
}
```
Risposta: booking_reference, totale, posti confermati.

- POST /api/seats/reserve
```json
{ "flightId": 51, "seatId": 123, "sessionId": "sess-uuid", "userId": 4 }
```

- POST /api/seats/confirm-booking
```json
{
  "bookingId": 88,
  "flightId": 51,
  "sessionId": "sess-uuid",
  "passengers": [{
    "seatId": 123,
    "name": "Mario Rossi",
    "email": "mario@example.com"
  }]
}
```

## 4. Autenticazione e Autorizzazione
- JWT firmato con secret server-side.
- Login endpoint → restituisce token con payload (id, role, airlineId?).
- Interceptor frontend inserisce `Authorization: Bearer <token>`.
- Route guard Angular: blocca nav per ruoli non autorizzati (admin dashboard, airline panel).
- Ruoli:
  - admin: pieno controllo (CRUD compagnie, aerei, rotte, voli, utenti).
  - airline: gestione flotta e voli associati, prezzi route, analytics interne.
  - user: prenotazioni e gestione profilo.
- Controlli server: middleware `authenticateToken` + `verifyRole`/funzioni specifiche (es. prevenzione prenotazioni airline su seats).

## 5. Frontend Angular (Componenti chiave)
- Presentazione / Navigazione: HomeComponent, FlightsView, FlightResults (search/filters), AirlineDashboard / AdminPanel.
- Autenticazione: UserLogin, UserRegister, AdminLogin, ProfileComponent (upload immagine), Settings.
- Prenotazione: SeatSelection / Seat Map UI, Checkout / Passenger Forms.
- Gestione dominio: AircraftAdmin, FlightAdmin, RouteAdmin, AirlineManagement.
- Notifiche / UX: NotificationsComponent, BookingsComponent (lista prenotazioni con cancellazione / refresh).
Servizi principali: FlightService, BookingService, SeatService, AuthService, UserService, AirlineService, RouteService, PricingService.
Routing: path protetti via guard (admin, airline). Lazy loading opzionale pianificato.

## 6. Workflow Utente (Esempi)
1. Utente cerca “Roma → Parigi” → vede voli diretti o con scalo (es. via Milano) con prezzi segmentati.
2. Seleziona volo → apre mappa posti → riserva temporaneamente 1A (hold 15 min).
3. Compila dati passeggeri → conferma → riceve booking reference (es. TW00XABC) e mail/recap (ipotizzabile).
4. Può cancellare la prenotazione (se politica lo consente) → posti tornano disponibili.
5. Admin accede a dashboard → verifica statistiche e aggiorna stato volo o modifica prezzo base rotta.

## 7. Contributi Specifici Jk-srt (Commits citati)
- Route Guards + Auth Interceptor (8be13b2, 94a26a0): sicurezza lato client e propagazione token.
- Filtraggio voli non disponibili + fix mapping ID FlightService (9e57219): UX migliorata e coerenza dati.
- AirlineStatsComponent + cancellazione prenotazioni ottimizzata (a2d7a75): osservabilità e robustezza flusso annullamenti.
- Prenotazioni con scalo, 2-step, pricing segmento, rilascio posti (733a0a5): esperienza multi-leg coerente.
- Pagina voli con filtri città/compagnie (11ab8db): miglior discovery.
- Gestione completa aeromobili (7452d0f): CRUD flotta integrato.
- UI avanzamenti Seat Selection (2a4818a): chiarezza disponibilità.
- Profilo utente + upload immagine e fix auth (ea8fc78, 3077639): personalizzazione e stabilità sessione.

## 8. Decisioni Tecniche Rilevanti
- Separazione credenziali (`accesso`) da dati passeggero (`users`) per principi di sicurezza.
- Funzioni DB per atomicità riserva/conferma posti riducendo condizioni di race.
- Vista consolidata voli per ridurre complessità JOIN lato applicazione.
- Mapping multilingua città per robustezza esperienza ricerca.
- Parametri dinamici finestra scalo (min/max) per tuning UX.

## 9. Possibili Evoluzioni
- Introduzione WebSocket per aggiornamenti dinamici posti/stati (client subscription attiva).
- Integrazione pagamento reale (Stripe o similari) con stati booking pending/paid.
- A/B testing prezzi dinamici per route_pricing.
- Audit trail (tabella eventi) per compliance.

## 10. Conclusione
L’insieme delle scelte architetturali garantisce scalabilità (separazione ruoli / funzioni), coerenza dei dati (vincoli e funzioni DB) e una UX progressiva (prenotazione con scalo e hold temporanei). Il contributo di Jk-srt ha rafforzato sicurezza, completezza feature e qualità dell’esperienza di prenotazione.

---

## Appendice A – Setup & Esecuzione (Estratto README)
1. Requisiti: Docker + Docker Compose, Node 20+ (solo per sviluppo locale non containerizzato), npm.
2. Variabili principali backend: `DATABASE_URL`, `DB_SSL`.
3. Avvio rapido:
  - Clona repo
  - Copia `.env.example` in `.env` e compila placeholder
  - `docker compose up -d --build`
  - Frontend: http://localhost:4200 – Backend: http://localhost:3000
4. Switch Neon ↔ Locale: modifica `DATABASE_URL` in `docker-compose.yml` e `DB_SSL` coerente (true Neon / false locale), opzionale avvio servizio `database` profilo `local`.
5. Script: `scripts/start.ps1` (Windows) / `scripts/start.sh` (Unix).

## Appendice B – Funzionalità Complete (Estratto README)
1. Autenticazione (JWT, ruoli user/airline/admin, cambio password iniziale airline)
2. Gestione Compagnie (attivazione, flotta, rotte)
3. Rotte normalizzate + pricing per classe (`route_pricing_view`)
4. Aerei & Posti (layout cabina, attributi posto, stato)
5. Voli (stati scheduled/delayed/cancelled/completed, ritardi, price breakdown)
6. Ricerca & UX (multi-filtri, mapping città bilingue, connessioni con finestra configurabile)
7. Prenotazioni (crea, lista, cancellazione con restituzione posto)
8. Seat Reservation Layer (hold temporaneo, conferma atomica, cleanup scadenze)
9. Sicurezza (bcrypt, helmet, CORS, middleware ruoli)
10. Monitoraggio & Logging (health, db-test, morgan)
11. Admin Dashboard (gestione entità e stati)
12. Performance (indici, viste consolidate, pooling)
13. DevOps (Docker multi-servizio, script avvio, init SQL)
14. Accessibilità UI (contrasto, disabilitazione contestuale, responsive)
15. Roadmap futuri (pagamenti, PWA, real-time, ML pricing)

## Appendice C – API Principali (Sintesi)
- Autenticazione: `POST /api/users/register`, `POST /api/users/login`
- Voli: `GET /api/flights`, `GET /api/flights/search`, `GET /api/flights/connections`, mutazioni stato (`/delay`, `/complete`, `/cancel`)
- Rotte: CRUD `/api/routes` + per compagnia `/api/routes/airline/:airlineId`
- Aerei: CRUD `/api/aircrafts`
- Prenotazioni: `POST /api/bookings`, `GET /api/bookings`
- Posti: `GET /api/seats/flight/:flightId`, `POST /api/seats/reserve`, `POST /api/seats/confirm-booking`
- Utility: `GET /api/health`, `GET /api/db-test`

## Appendice D – Changelog (Estratto)
- v3.2.0: UX prenotazioni migliorata, cancellazione con rilascio posto, dashboard compagnie.
- v3.1.0: Sistema stati voli avanzato (ritardi, badge, restrizioni prenotazione).
- v3.0.0: Introdotta tabella `routes` e normalizzazione schema voli.
- v2.0.0: Flight admin panel + multi-ruolo + API complete.
- v1.0.0: MVP (visualizzazione voli, prenotazioni base).

## Appendice E – Generazione PDF
Conversione suggerita (richiede pandoc + LaTeX o wkhtmltopdf):
`pandoc REPORT_Jk-srt.md -o Cognome_Nome_Matricola.pdf`
Assicurarsi di sostituire placeholder Matricola e rinominare il file secondo convenzione.
