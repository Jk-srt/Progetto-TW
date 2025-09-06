# Report Individuale – 32gede

Nome File PDF (convenzione): Cognome_Nome_Matricola.pdf  
Matricola: __________________

## 1. Architettura Complessiva
La piattaforma adotta un’architettura stratificata:
- **Presentation Layer (Angular)**: Single Page Application con componenti standalone e servizi iniettati per orchestrare chiamate REST e stato (auth, voli, prenotazioni, selezione posti).
- **Application Layer (Express/TypeScript)**: routing REST modulare (flights, routes, seats, bookings, users, aircrafts, route-pricing, auth). Middleware centralizzati per logging, error handling, sicurezza (JWT, role-based access).
- **Domain & Persistence Layer (PostgreSQL)**: schema relazionale normalizzato (3NF) con estensioni dedicate per pricing e seat management; funzioni PL/pgSQL per logica transazionale (prenotazioni temporanee, conferme, cleanup).
- **Infrastructure**: Docker Compose orchestrazione servizi; possibilità di usare Neon come DB gestito oppure Postgres locale. Build separation: dev hot-reload backend vs build statico frontend con Nginx.
- **Background Processing**: job programmato per avanzamento stato voli (scheduler) e possibili estensioni future (notifiche ritardi, cleanup supplementare).

## 2. Modello Dati & Razionalizzazioni Introdotte
Contributo principale: ristrutturazione schema per usare `route_id` come chiave semantica dei voli eliminando ridondanza di (departure_airport_id, arrival_airport_id) direttamente dentro `flights`. Effetti:
- Semplificazione delle query (un solo join verso routes).
- Centralizzazione attributi statici della tratta (distance_km, estimated_duration) in `routes`.
- Riduzione rischio inconsistenze tra voli e tratte.

Tabelle chiave (estratto):
- `routes` (unique coppia departure_airport_id, arrival_airport_id)
- `flights` (route_id FK, airline_id, aircraft_id, price additivo rispetto a base rotta + pricing per classe)
- `route_pricing` (prezzo base differenziato per seat_class) → join + surcharge dinamico in query ricerca.
- Estensione seat management: gestione hold e conferme modulare mantenendo atomicità DB.

Viste create/ottimizzate: `flights_with_airports`, `route_pricing_view`, `flight_seat_map` (quest’ultima incrocia seats, temporary reservations e bookings).

## 3. API REST – Evoluzioni e Miglioramenti
Le attività di 32gede hanno ampliato e raffinato gli endpoint dei voli:
- **API voli funzionale** (commit 6e78e9d): base CRUD e fetch consolidato.
- **Ristrutturazione schema** (685d4af): tutte le query aggiornate a usare `route_id`, aggiunta vista aggregata.
- **Ricerca voli avanzata** (6b5bf06, 5182723, 05d13b6):
  - Mappatura multi-lingua città (es. Roma/Rome, Parigi/Paris).
  - Filtro data opzionale + fallback intervallo dinamico per connessioni.
  - Calcolo prezzi finali per classe (economy, business, first) = base route_pricing + surcharge volo.
  - Ordinamenti per tempo e prezzo.
- **Scheduler stato voli** (01af5cc): transizione automatica scheduled → in_progress → completed; previsione cancellazioni/delays.
- **Stati avanzati & pricing dettagliato** (19fa97f, ed0f6aa, bc3d47e, ff96d1d): arricchimento modello status e risposta API con breakdown prezzi.
- **Refactor front-home + doc v3.x** (9264f48, 2f6f496): migrazione componenti a standalone e aggiornamento documentazione.
- **Nuovi endpoint gestione voli** (2f20dbb): endpoints ausiliari `/data/*` (airports, airlines, aircrafts) per popolare dropdown e ridurre payload multipli.

## 4. Ricerca Voli & Connessioni (Dettaglio Tecnico)
La logica delle connessioni usa join self-referenziato su vista `flights_with_airports`:
- Matching tra arrivo primo volo e partenza secondo volo via IATA code o city name (supporto varianti linguistiche).
- Finestra di scalo configurabile (min/max minuti) con default ragionevoli.
- Aggregazione prezzi multi-leg: somma componenti economy/business/first distinct.
- Normalizzazione data (accetta ISO e dd/mm/yyyy) → robustezza input.

Pseudo‐query semplificata (concettuale):
```
WITH cte AS (
  SELECT f1.*, f2.*, calc_prezzi, connection_interval
  FROM flights_with_airports f1
  JOIN flights_with_airports f2 ON f1.arrival_code = f2.departure_code
   AND interval BETWEEN min AND max
  WHERE date filters ...
)
SELECT normalised projection + totali;
```
Ottimizzazioni:
- Indici su `departure_time`, `route_id`, `seat_class` riducono costi di esecuzione.
- Uso di proiezione selettiva per ridurre overhead transfer.

## 5. Autenticazione & Sicurezza (Interazione ai contributi)
Il refactor ha mantenuto compatibilità con middleware esistenti; aggiustamenti alle query per assicurare che i filtri airline/user si applichino dopo l’introduzione del `route_id`. Il payload JWT fornisce contesto sufficiente per determinare permessi lato server (airlineId del proprietario volo).

## 6. Frontend – Aggiornamenti Correlati
- Adattamento servizi FlightService per nuovi parametri (ricerca connessioni, mapping città, seat_class pricing breakdown).
- Interfacce TypeScript aggiornate con campi `economy_price`, `business_price`, `first_price`, `connection_type`.
- Miglior gestione fallback quando non esiste first class (valore 0 coerente UI).

## 7. Esempi Endpoint Rilevanti
- Ricerca diretta:
```
GET /api/flights/search?departure_city=Roma&arrival_city=Parigi&departure_date=2025-09-11
```
- Ricerca connessioni con finestra personalizzata:
```
GET /api/flights/connections?departure_city=Roma&arrival_city=Parigi&departure_date=2025-09-11&min_connection_minutes=30&max_connection_minutes=300
```
- Scheduler (configurazione env):
```
ENABLE_FLIGHT_STATUS_JOB=true
FLIGHT_STATUS_INTERVAL_MS=300000
```

## 8. Contributi Specifici 32gede
- 6e78e9d: Prima versione stabile API voli.
- 685d4af: Introduzione `route_id` e vista consolidata.
- 6b5bf06 / 5182723 / 05d13b6: Evoluzioni iterative sulla ricerca (mapping città, parametri opzionali, robustezza input data, sorting).
- 01af5cc: Scheduler stati volo.
- 19fa97f / ed0f6aa / bc3d47e / ff96d1d: Stati avanzati, sovrapprezzi, pricing composito.
- 9264f48 / 2f6f496: Refactor frontend home + doc tecnica.
- 2f20dbb: Endpoint supporto e struttura modulare `/data/*`.

## 9. Decisioni Tecniche Chiave
- Uso di viste per semplificare la superficie API e ridurre duplicazione JOIN.
- Parametrizzazione algoritmo connessioni → maggiore flessibilità UX.
- Normalizzazione del pricing (base + surcharge flight) per facilitare futuri motori dinamici.
- Schedulazione interna (in-process) invece che esterna (cron) per semplicità deploy MVP.

## 10. Proposte Evolutive
- Introduzione motore di dynamic pricing (domanda/offerta, load factor).
- Cache risultati ricerca breve termine (Redis) per ridurre latenza.
- Precalcolo grafo connessioni multi‐leg (oltre 1 scalo) con Dijkstra su tempo totale o costo.
- Emissione eventi (es. cambi stato volo) via WebSocket / SSE per aggiornare UI in tempo reale.

## 11. Conclusione
I contributi di 32gede hanno trasformato la piattaforma da semplice gestione voli a motore di ricerca flessibile con pricing strutturato, riducendo complessità e migliorando l’estensibilità futura. Il riuso di viste e funzioni DB garantisce un equilibrio tra performance e manutenibilità.

---

## Appendice A – Setup & Esecuzione (Estratto README)
1. Clona repository e prepara `.env` da `.env.example`.
2. Avvio: `docker compose up -d --build` (Neon default). Per Postgres locale abilita profilo `local` e aggiorna `DATABASE_URL` + `DB_SSL=false`.
3. Frontend: http://localhost:4200 – Backend: http://localhost:3000 – Health: `/api/health`.
4. Script rapidi: `scripts/start.ps1` / `scripts/start.sh`.
5. Variabili chiave: `DATABASE_URL`, `DB_SSL`, opzionale scheduler (`ENABLE_FLIGHT_STATUS_JOB`).

## Appendice B – Funzionalità Complete (Sintesi)
Autenticazione ruoli, compagnie aeree, rotte normalizzate, pricing per classe, gestione aerei/posti, stati volo avanzati, ricerca connessioni, prenotazioni con hold posti, sicurezza (JWT+bcrypt+helmet), logging & health, dashboard admin, performance (indici+viste), Docker multi-servizio, roadmap (pagamenti, PWA, ML pricing, real-time).

## Appendice C – API Principali
- Auth: `POST /api/users/register`, `POST /api/users/login`
- Flights: `/api/flights`, `/api/flights/search`, `/api/flights/connections`, update stato (`/delay`, `/cancel`, `/complete`)
- Routes: `/api/routes` CRUD + `/api/routes/airline/:id`
- Aircrafts: `/api/aircrafts` CRUD
- Bookings: `/api/bookings`
- Seats: `/api/seats/flight/:flightId`, `/api/seats/reserve`, `/api/seats/confirm-booking`
- Utility: `/api/health`, `/api/db-test`

## Appendice D – Changelog (Estratto)
- 3.2.0 prenotazioni & UX compagnie
- 3.1.0 stati voli avanzati
- 3.0.0 normalizzazione rotte
- 2.0.0 flight admin + multi-ruolo
- 1.0.0 MVP

## Appendice E – Generazione PDF
Esempio comando: `pandoc REPORT_32gede.md -o Cognome_Nome_Matricola.pdf`
Sostituire placeholder Matricola prima della conversione.
