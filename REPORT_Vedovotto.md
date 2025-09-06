# Report Individuale – Vedovotto

Nome File PDF (convenzione): Cognome_Nome_Matricola.pdf  
Matricola: __________________

## 1. Visione Architetturale
L’apporto di Vedovotto si concentra sulla trasformazione del processo di prenotazione posti in un flusso affidabile, concorrenziale e user-friendly, introducendo un sotto‐sistema dedicato alla gestione temporanea dei posti e alla successiva conferma. Tale componente media tra frontend (esperienza interattiva Seat Selection) e backend (transazioni sicure su PostgreSQL) tramite funzioni server + PL/pgSQL.

Stack sottostante:
- **Frontend**: UI mappa posti con stato in tempo quasi reale; session ID per ospiti; recupero e rinnovo automatico prenotazioni temporanee.
- **Backend**: endpoint `/api/seats/*` + (layer legacy `/api/seat-reservations/*`) per retrocompatibilità; orchestrazione passaggi hold → confirm.
- **Database**: logica rigorosa tramite funzioni transazionali per prevenire race condition e doppi booking.

## 2. Modello Dati Esteso per Gestione Posti
Estensioni principali introdotte (commit cardine 41f271f e successivi):
- `aircraft_seats`: modellazione fisica della cabina (row_number + seat_letter → seat_number) con attributi semantici (class, type window/middle/aisle).
- `temporary_seat_reservations`: prenotazioni temporanee con scadenza (expires_at) e session binding; consente utenti non autenticati (guest) via session_id.
- `seat_bookings`: conferma definitiva del posto legata a `booking_id`.
- `flight_seat_map` (vista): consolidamento stato per singolo seat → (booked / temporarily_reserved / unavailable / available).
- Funzioni: `reserve_seat_temporarily`, `release_seat_reservation`, `confirm_seat_booking`, `cleanup_expired_reservations` + trigger `cleanup_trigger`.

Flusso stato posto:
```
available → (reserve) → temporarily_reserved → (confirm) → booked
    \____________________________________ (expire / release) → available
```

## 3. API Seat Management
Endpoint principali (nuovi o estesi):
- `POST /api/seats/reserve` – valida posto libero, crea/aggiorna hold (15 min rolling window).
- `POST /api/seats/renew-reservation` – estende scadenza se sessione attiva.
- `POST /api/seats/release` / `POST /api/seats/release-session` – rilascio manuale singolo o di tutta la sessione.
- `POST /api/seats/confirm-booking` – validazione multipla + inserimento `seat_bookings` + cleanup hold.
- `GET /api/seats/flight/:flightId` – mappa completa (derivata da vista, evita n query).
- `POST /api/seats/release-expired` – endpoint ausiliario per cleanup (in aggiunta al trigger SQL).
- Legacy: `/api/seat-reservations/*` mantenuto per migrazione graduale.

Design choices:
- Minimizzare race tramite UNIQUE(flight_id, seat_id) sia su prenotazioni temporanee che definitive.
- Funzioni PL/pgSQL eseguono controlli atomici evitando round-trip extra.
- Session ID come pivot per utenti guest → esperienza frictionless prima della registrazione.

## 4. Prenotazione Temporanea & Guest Support
Introduzione supporto utenti ospite (commit 6acc542):
- Possibilità iniziare processo senza account.
- Alla conferma: opzionale associazione ad un utente registrato (post‐login) senza perdere hold.
- Riduzione abbandono funnel (conversion uplift potenziale) grazie a minor barriera iniziale.

Meccanismi di scadenza:
- Timeout configurato a 15 minuti rigenerato ad ogni rinnovo.
- Trigger su insert nuova prenotazione temporanea → pulizia scadute (`cleanup_trigger`).
- Endpoint manuale per forzare rilascio (strumento di manutenzione / fallback).

## 5. Integrazione con Booking Flow
Sequenza end-to-end:
1. Seat map fetch → stato attuale.
2. Utente seleziona posti → `reserve` (multi-chiamate per più sedili).
3. Checkout → calcolo totale (somma prezzi + potenziali supplementi futuri).
4. Conferma → creazione record `bookings` + chiamata `confirm-booking` per ogni posto.
5. Liberazione posti non confermati alla scadenza automatica.

Sinergie con altri moduli:
- Interoperabilità con pricing per classe (economy/business/first) già presente via route_pricing.
- Stato volo (scheduled/delayed) può condizionare apertura prenotazione futura (estendibile).

## 6. Gestione Concorrenza e Coerenza
Criticità affrontate:
- Double booking: prevenuto via UNIQUE e controllo esistenza in `seat_bookings` prima della conferma.
- Dirty reads: evitati usando singolo passaggio transazionale nella funzione PL/pgSQL.
- Rilascio zombie: trigger di cleanup + endpoint periodico ridondante (difesa in profondità).

## 7. Sicurezza & Validazioni
- Verifica che utenti con ruolo `airline` non possano prenotare come passeggeri (middleware `preventAirlineBooking`).
- Sanitizzazione parametri (seatId, flightId) e controllo coerenza su `flight_id` in conferma.
- Minimizzazione superfici d’attacco (no esposizione diretta ID interni non necessari nella UI oltre a quelli funzionali).

## 8. Contributi Specifici Vedovotto
- 41f271f: Implementazione end‑to‑end sistema prenotazione posti.
- 1a061e8: Introduzione hold temporaneo 15 minuti + estensione logica scadenze.
- 6acc542: Supporto utenti ospite + session binding.
- b709f7b / 34709ba: Refactor URL environment + configurazione Nginx per corretto proxy (uniformità tra ambienti).
- 07173d9: Ristrutturazione DB separando credenziali (accesso) da profilo utente (users) → security & normalization.
- d3152c2: Merge conflict resolution e cleanup stabilità branch principale.

## 9. Esempi JSON
Prenotazione temporanea:
```json
POST /api/seats/reserve
{ "flightId": 51, "seatId": 120, "sessionId": "sess-94f3", "userId": null }
```
Conferma posti multipli:
```json
POST /api/seats/confirm-booking
{
  "bookingId": 77,
  "flightId": 51,
  "sessionId": "sess-94f3",
  "passengers": [
    { "seatId": 120, "name": "Luca Bianchi", "email": "luca@example.com" },
    { "seatId": 121, "name": "Sara Verdi", "email": "sara@example.com" }
  ]
}
```

## 10. Benefici Architetturali
- Scalabilità: spostando la logica di concorrenza nel DB si riduce complessità applicativa e rischio race lato Node.
- Osservabilità futura: la vista `flight_seat_map` è base naturale per metriche (occupancy rate, conversion ratio hold→booked).
- Estendibilità: semplice aggiungere classi posto premium o attributi (es. extra_legroom) senza rompere l’attuale flusso.

## 11. Miglioramenti Futuri Proposti
- Aggiunta TTL configurabile per hold (parametrizzato da rotta o load factor).
- WebSocket push eventi seat-status-change per aggiornamenti in tempo reale senza polling.
- Integrazione motore pricing dinamico (sovrapprezzo su ultime file disponibili).
- Audit log prenotazioni per tracciabilità e analytics antifrode.

## 12. Conclusione
Il contributo di Vedovotto ha reso robusto e competitivo il cuore dell’esperienza di prenotazione, garantendo coerenza dei dati, prevenzione dei conflitti e flessibilità per evoluzioni future. La strategia “DB first” per la logica di locking temporaneo si è dimostrata efficace e manutenibile.

---

## Appendice A – Setup & Esecuzione (Estratto README)
Prerequisiti: Docker, Docker Compose. Passi: clone → copia `.env.example` → `docker compose up -d --build` → accedi frontend (4200) e backend (3000). Switch DB (Neon/locale) modificando `DATABASE_URL` e `DB_SSL`. Script rapidi in `scripts/`.

## Appendice B – Funzionalità Complete (Sintesi)
Auth ruoli, gestione compagnie, rotte & pricing, aerei & posti, stati voli, ricerca voli + connessioni, prenotazioni, layer seat reservation (hold+confirm), sicurezza, monitoraggio, admin dashboard, performance tramite indici+viste, devops container, roadmap evolutiva (pagamenti, PWA, real-time, ML pricing).

## Appendice C – API Principali
- Voli: `/api/flights`, `/api/flights/search`, `/api/flights/connections`
- Posti: `/api/seats/flight/:flightId`, `/api/seats/reserve`, `/api/seats/confirm-booking`
- Prenotazioni: `/api/bookings`
- Rotte & Aerei: `/api/routes`, `/api/aircrafts`
- Auth: `/api/users/register`, `/api/users/login`
- Utility: `/api/health`

## Appendice D – Changelog (Estratto)
3.2.0 UX prenotazioni; 3.1.0 stati voli; 3.0.0 normalizzazione rotte; 2.0.0 flight admin; 1.0.0 MVP.

## Appendice E – Generazione PDF
Comando esempio: `pandoc REPORT_Vedovotto.md -o Cognome_Nome_Matricola.pdf`
Rinomina file con matricola compilata prima della consegna.
