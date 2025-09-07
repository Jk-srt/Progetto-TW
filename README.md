# ✈️ TAW Flights - Sistema di Gestione Voli

Un sistema completo per la gestione e prenotazione di voli sviluppato con tecnologie moderne. Il progetto include un frontend Angular, un backend Node.js/TypeScript e un database PostgreSQL con integrazione cloud Neon.

![TAW Flights](https://img.shields.io/badge/Version-3.3.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)
![Angular](https://img.shields.io/badge/Angular-17+-red.svg)
![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)

## 🚀 Caratteristiche Principali

### 🎯 Funzionalità Core
- **Gestione Voli Completa**: Visualizzazione, ricerca, filtraggio e amministrazione voli
- **🆕 Sistema Stati Avanzato**: Gestione completa stati voli (programmato, ritardato, cancellato, completato)
- **⏰ Gestione Ritardi**: Calcolo automatico e visualizzazione ritardi con indicatori visivi
- **🚫 Controllo Prenotazioni**: Restrizioni intelligenti basate su stato volo (cancellato = non prenotabile)
- **Sistema di Amministrazione Voli**: Pannello dedicato per compagnie aeree con gestione CRUD completa
- **💰 Pricing Dinamico**: Visualizzazione range prezzi reali (economia, business, first class)
- **Autenticazione Multi-Ruolo**: Sistema JWT con utenti, admin e compagnie aeree
- **Dashboard Compagnie**: Interfaccia dedicata per la gestione dei voli delle compagnie
- **Sistema Prenotazioni**: Prenotazione voli con gestione posti e tracking
- **Database Cloud**: Integrazione con Neon PostgreSQL per performance ottimali
- **API RESTful Completa**: Endpoints per tutte le operazioni CRUD

### 🆕 Nuove Funzionalità (v3.3) - Inviti Compagnie & Booking Extras (Settembre 2025)
- **Invito Compagnie (Registration by Invitation)**: le compagnie non possono più auto‑registrarsi; solo un admin può crearle con password temporanea.
- **must_change_password**: nuovo flag (colonna in `accesso`) che forza il cambio password al primo login della compagnia prima dell'attivazione definitiva (`airlines.active` passa da FALSE a TRUE solo dopo cambio password).
- **Workflow Attivazione**: creazione -> airline `active = FALSE` + credenziali con `must_change_password = TRUE` -> login iniziale restituisce `must_change_password` -> endpoint `/api/auth/force-change-password` -> attivazione.
- **Eliminazione Compagnie Migliorata**: `DELETE /api/auth/airlines/:id` ora esegue hard delete se la compagnia non ha voli; soft delete (disattivazione) se esistono voli, con opzione `?force=true` per rimuovere anche le credenziali.
- **Risposta Endpoint Delete**: ritorna `action: hard_deleted | soft_deleted`, `flights_count` e messaggi esplicativi.
- **Booking Extras Itemizzati**: confermata integrazione tabella `booking_extras`; calcolo totale lato UI aggiornato includendo solo gli extra supportati.
- **Pulizia Extra Deprecati**: rimossi dalla visualizzazione gli extra legacy `extra_legroom` e `preferred_seat` (non più mostrati nelle prenotazioni).
- **Prezzo Biglietto Aggiornato**: nel riepilogo prenotazioni il prezzo visualizzato include automaticamente il totale degli extra attivi (baggage / priority_boarding / premium_meal).
- **Hard/Soft Delete Reporting**: aggiunta semantica di audit nelle risposte JSON per debugging amministrativo.

### 🆕 Nuove Funzionalità (v3.2) - UX Prenotazioni, Compagnie e Rotte
- **Cancellazione Prenotazioni Utente**: ora puoi annullare una prenotazione se mancano più di 24 ore alla partenza; il posto viene liberato e i posti disponibili del volo si aggiornano automaticamente (UI con stato “Annullando…” e notifiche).
- **Pagina Prenotazioni potenziata**: loader CSS accessibile e, per utenti compagnia, dashboard con tab Panoramica e Posti Prenotati, mappa posti per volo e distribuzione per classe con metriche (ricavi/occupazione).
- **Ricerca voli semplificata**: rimosso andata/ritorno; la ricerca è solo andata per impostazione predefinita con aeroporti caricati dinamicamente da AirportService.
- **Selezione voli diretti → posti**: se scegli un volo diretto dalla ricerca vieni portato direttamente alla selezione dei posti.
- **Mappa posti compatta**: toggle “vista compatta” che nasconde elementi decorativi e migliora leggibilità (corsia, overflow, responsive).
- **UI basata sui ruoli**: gli utenti “airline” non vedono azioni di prenotazione (“Prenota/Seleziona”).
- **Gestione rotte per compagnie**: aggiornamento parziale robusto (COALESCE) e compilazione automatica di airline_id per utenti compagnia; logging diagnostico su frontend e backend per eventuali errori.

### 🆕 Nuove Funzionalità (v3.1) - Sistema Stato Voli Avanzato
- **🚨 Gestione Stati Voli**: Sistema completo per gestire cancellazioni, ritardi e completamenti
- **⏰ Calcolo Ritardi**: Visualizzazione automatica dei minuti di ritardo per voli delayed
- **🚫 Restrizioni Prenotazione**: Voli cancellati non prenotabili, voli ritardati con avvisi
- **📊 Indicatori Visivi**: Badge colorati per stati (Programmato, Ritardato, Cancellato, Completato)
- **🔧 Gestione Admin**: Pannello compagnie aeree per aggiungere ritardi e gestire stati
- **📈 Prezzi Reali**: Visualizzazione range prezzi calcolati invece del solo sovrapprezzo
- **🎯 UX Migliorata**: Interfaccia intuitiva con colori e icone per ogni stato volo

### 🆕 Nuove Funzionalità (v3.0) - Sistema Rotte
- **🛣️ Gestione Rotte**: Sistema normalizzato con rotte predefinite per le compagnie aeree
- **🏗️ Architettura Normalizzata**: I voli ora utilizzano route_id invece di aeroporti separati
- **🏢 Rotte per Compagnia**: Ogni compagnia aerea gestisce solo le proprie rotte autorizzate
- **🎯 Selezione Intelligente**: Il form di creazione voli mostra solo le rotte della propria compagnia
- **📊 Compatibilità Retroattiva**: Vista database flights_with_airports per mantenere compatibilità
- **🔍 Ricerca Estesa**: Filtri di ricerca includono anche i nomi delle rotte
- **⚡ Performance Ottimizzate**: Join ottimizzati per query veloci con informazioni complete

### 🔧 Tecnologie Utilizzate

#### Frontend
- **Angular 17+** - Framework principale con Standalone Components
- **TypeScript** - Linguaggio tipizzato con strict null checks
- **SCSS** - Preprocessore CSS con variabili e mixins
- **Angular Reactive Forms** - Gestione form reattiva
- **HttpClient** - Comunicazione HTTP ottimizzata
- **Angular Router** - Routing single-page application

#### Backend
- **Node.js 20+** - Runtime JavaScript moderno
- **Express.js** - Framework web minimalista
- **TypeScript** - Linguaggio tipizzato per maggiore sicurezza
- **PostgreSQL** - Database relazionale con Neon Cloud
- **JWT** - Autenticazione token-based stateless
- **bcrypt** - Hashing password sicuro
- **Morgan** - Logging HTTP requests
- **Helmet** - Sicurezza headers HTTP

#### Database & Cloud
- **Neon PostgreSQL** - Database cloud serverless
- **Connection Pooling** - Gestione connessioni ottimizzata
- **Database Migrations** - Script di inizializzazione automatica
- **Indexes** - Ottimizzazione query per performance

#### DevOps & Tools
- **Docker & Docker Compose** - Containerizzazione completa
- **Multi-stage Builds** - Ottimizzazione immagini Docker
- **Hot Reload** - Sviluppo con auto-refresh
- **CORS** - Cross-origin resource sharing configurato

## 📁 Struttura del Progetto

```
Progetto-TW/
├── 📁 frontend/                 # Applicazione Angular
│   ├── 📁 src/
│   │   ├── index.html          # Entry point HTML
│   │   ├── main.ts             # Bootstrap Angular
│   │   ├── styles.scss         # Stili globali
│   │   └── 📁 app/
│   │       ├── app.ts          # Root component
│   │       ├── app-routing-module.ts  # Routing configuration
│   │       ├── 📁 components/   # Componenti UI
│   │       │   ├── home.component.ts
│   │       │   ├── flights-view.component.ts     # Visualizzazione voli
│   │       │   ├── flight-admin.component.ts     # 🆕 Admin panel voli con gestione stati
│   │       │   ├── user-login.component.ts
│   │       │   ├── airline-login.component.ts    # 🆕 Login compagnie
│   │       │   ├── user-register.component.ts
│   │       │   ├── bookings.component.ts
│   │       │   ├── settings.component.ts
│   │       │   ├── flight-card/                  # 🆕 Card componente volo con stati
│   │       │   │   ├── flight-card.component.ts  # Logica stati e restrizioni prenotazione
│   │       │   │   └── flight-card.component.scss # Stili badge stati colorati
│   │       │   ├── flight-filters/               # Filtri ricerca
│   │       │   ├── flight-search/                # Barra ricerca
│   │       │   ├── flights-grid/                 # Griglia voli
│   │       │   ├── stats-section/                # 🆕 Sezione statistiche
│   │       │   └── welcome-section/              # Sezione benvenuto
│   │       ├── 📁 models/       # Interfacce TypeScript
│   │       │   ├── flight.model.ts               # 🆕 Interfacce complete
│   │       │   │   ├── Flight                    # Modello volo
│   │       │   │   ├── Airport                   # 🆕 Modello aeroporto
│   │       │   │   ├── Airline                   # 🆕 Modello compagnia
│   │       │   │   ├── Aircraft                  # 🆕 Modello aereo
│   │       │   │   └── FlightFormData            # 🆕 Form data
│   │       │   └── user.model.ts                 # Modello utente
│   │       └── 📁 services/     # Servizi Angular
│   │           ├── flight.service.ts             # Servizi voli base
│   │           ├── flight-admin.service.ts       # 🆕 Servizi admin voli
│   │           ├── route-admin.service.ts        # 🆕 Servizi gestione rotte
│   │           └── global-flights.service.ts     # 🆕 Servizi globali
│   ├── angular.json            # Configurazione Angular
│   ├── package.json           # Dipendenze frontend
│   ├── tsconfig.json          # Configurazione TypeScript
│   └── Dockerfile             # Container frontend
├── 📁 backend/                  # API Node.js/TypeScript
│   ├── 📁 src/
│   │   ├── app.ts              # 🆕 Server Express ottimizzato
│   │   ├── 📁 db/              # Database connection
│   │   │   ├── pool.ts         # 🆕 Connection pooling (singleton)
│   │   │   └── websocket/      # Servizi WebSocket (seat updates)
│   │   ├── 📁 middleware/      # Middleware Express
│   │   │   └── auth.ts         # 🆕 JWT authentication
│   │   ├── 📁 models/          # Modelli database
│   │   │   └── database.ts     # 🆕 DatabaseService completo
│   │   ├── 📁 routes/          # 🆕 API Routes modulari
│   │   │   ├── auth.ts         # Autenticazione
│   │   │   ├── users.ts        # Gestione utenti
│   │   │   ├── flights.ts      # 🆕 API voli complete
│   │   │   ├── airlines.ts     # 🆕 API compagnie aeree
│   │   │   ├── aircrafts.ts    # 🆕 API aerei
│   │   │   ├── airports.ts     # 🆕 API aeroporti
│   │   │   ├── bookings.ts     # API prenotazioni
│   │   │   ├── admin.ts        # 🆕 API amministrazione
│   │   │   ├── routes.ts       # 🆕 API gestione rotte
│   │   │   └── route-pricing.ts # 🆕 API pricing rotte
│   │   └── 📁 types/           # Type definitions
│   │       └── morgan.d.ts     # Morgan types
│   ├── 📁 database-init/       # Script inizializzazione DB
│   │   └── init.sql           # 🆕 Schema completo Neon con rotte
│   ├── package.json           # Dipendenze backend
│   ├── tsconfig.json          # Configurazione TypeScript
│   └── Dockerfile             # Container backend
├── 📁 database/                 # 🆕 Database PostgreSQL
│   └── 📁 postgres-init/
│       ├── init.sql            # Schema database locale
│       └── migration_new_schema.sql # 🆕 Migrazione schema rotte
├── 📁 scripts/                 # Script di utilità
│   ├── setup.sh              # Setup Linux/Mac
│   ├── start.sh               # Start script Unix
│   └── start.ps1              # 🆕 Start script Windows
├── docker-compose.yml          # 🆕 Orchestrazione ottimizzata
├── package.json               # Dipendenze root
├── test-frontend.html         # Test frontend
├── test-server.js             # Test server
└── README.md                  # Documentazione
```

## 🗄️ Schema Database (Allineato allo stato attuale)

La seguente documentazione riflette la struttura reale del database (derivata da `information_schema.columns`) invece del vecchio schema teorico. Alcune tabelle “storiche” documentate prima (es. campi email/password dentro `users`) sono state normalizzate nella tabella `accesso`.

### Panoramica Tabelle

| Tabella | Scopo Principale |
|---------|------------------|
| accesso | Credenziali & ruolo (autenticazione) |
| users | Dati anagrafici passeggeri (profilo) |
| airlines | Compagnie aeree |
| aircrafts | Aerei / flotta compagnie |
| aircraft_seats | Layout posti fisici per aereo |
| routes | Rotte (origine/destinazione + distanza) |
| route_pricing / route_pricing_view | Prezzi base per rotta e classi |
| airports | Aeroporti (nome, città, coordinate) |
| flights | Voli programmati legati a rotte |
| flights_with_airports | Vista arricchita (join rotta + aeroporti) |
| bookings | Prenotazioni base (stato, prezzo, riferimenti) |
| booking_details | Vista/denormalizzazione dettagli prenotazione + passeggero + volo |
| flight_seat_map | Mappa posti per volo (stato/attributi) |
| flight_seat_availability | Proiezione disponibilità posti volo |
| seat_bookings | Associazione posto-volo-prenotazione/passeggero |
| temporary_seat_reservations | Lock temporaneo posti (session based) |

### 1. Tabella `accesso`
Contiene autenticazione e collegamenti opzionali a utente passeggero o compagnia.
```sql
id SERIAL PK
email VARCHAR NOT NULL UNIQUE
password_hash VARCHAR NOT NULL
role VARCHAR NOT NULL DEFAULT 'user' -- valori: user | admin | airline
airline_id INTEGER NULL -- se account compagnia
user_id INTEGER NULL    -- se account passeggero (riga in users)
profile_image_url VARCHAR NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
Note:
- Separazione credenziali (accesso) vs profilo (`users`) semplifica privacy e reset.
- `airline_id` o `user_id` sono mutuamente esclusivi (enforced a livello applicativo).

### 2. Tabella `users`
Solo dati anagrafici/passaporto (nessuna email o password qui):
```sql
id SERIAL PK
first_name VARCHAR NULL
last_name  VARCHAR NOT NULL
phone VARCHAR NULL
date_of_birth DATE NULL
nationality VARCHAR NULL
passport_number VARCHAR NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 3. Tabella `airlines`
```sql
id SERIAL PK
name VARCHAR NOT NULL
iata_code VARCHAR NOT NULL
icao_code VARCHAR NOT NULL
country VARCHAR NOT NULL
founded_year INTEGER NULL
website VARCHAR NULL
logo_url VARCHAR NULL
active BOOLEAN DEFAULT true
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 4. Tabella `aircrafts` & `aircraft_seats`
`aircrafts` descrive l'aereo; `aircraft_seats` il layout dettagliato.
```sql
aircrafts(id PK, airline_id FK, registration UNIQUE, aircraft_type, manufacturer, model,
      seat_capacity, business_class_seats, economy_class_seats, manufacturing_year,
      last_maintenance DATE, status, created_at, updated_at)

aircraft_seats(id PK, aircraft_id FK, seat_number, seat_row INT, seat_column CHAR,
           seat_class VARCHAR DEFAULT 'economy', is_window BOOL, is_aisle BOOL,
           is_emergency_exit BOOL, status VARCHAR DEFAULT 'available', created_at TIMESTAMP)
```

### 5. Tabella `airports`
```sql
id SERIAL PK
name VARCHAR NOT NULL
iata_code VARCHAR NOT NULL
city VARCHAR NOT NULL
country VARCHAR NOT NULL
latitude NUMERIC NULL
longitude NUMERIC NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 6. Tabelle Rotte & Pricing
```sql
routes(id PK, route_name, departure_airport_id FK, arrival_airport_id FK,
       distance_km, estimated_duration, default_price NUMERIC, status DEFAULT 'active',
       airline_id, created_at, updated_at)

route_pricing(id PK, route_id FK, seat_class, base_price, created_at, updated_at)

route_pricing_view(route_id, route_name, departure_airport_id, arrival_airport_id,
           departure_airport, departure_code, departure_city,
           arrival_airport, arrival_code, arrival_city,
           seat_class, base_price, distance_km, estimated_duration, status)
```
`route_pricing_view` unisce rotta + prezzi per classe per consultazione rapida.

### 7. Tabelle Voli
```sql
flights(id PK, flight_number, departure_time, arrival_time, price NUMERIC,
    total_seats, available_seats, status DEFAULT 'scheduled', created_at,
    updated_at, airline_id, aircraft_id, route_id, seat_class DEFAULT 'economy')

flights_with_airports(...) -- vista di join arricchita (rotta + aeroporti + compagnia + aereo)
```
Stati tipici: scheduled | delayed | cancelled | completed (gestiti a livello applicativo).

### 8. Prenotazioni
Base + dettagli denormalizzati (colonne obsolete rimosse: `special_requests`, `role`):
```sql
bookings(id PK, user_id FK, flight_id FK, seat_id FK, booking_reference,
  booking_class DEFAULT 'economy', price NUMERIC, booking_status DEFAULT 'confirmed',
  booking_date TIMESTAMP, updated_at TIMESTAMP,
  passenger_first_name, passenger_last_name, passenger_email, passenger_phone)

booking_details(...) -- tabella/vista di dettaglio combinando booking + volo + posto + passeggero
```
Nota: se stai aggiornando da una versione precedente eseguire una migrazione simile a:
```sql
ALTER TABLE bookings DROP COLUMN IF EXISTS special_requests;
ALTER TABLE bookings DROP COLUMN IF EXISTS role; -- presente solo in alcune versioni sperimentali
```

### 9. Gestione Posti Volo
```sql
flight_seat_map(flight_id, seat_id, seat_number, seat_row, seat_column, seat_class,
        is_window, is_aisle, is_emergency_exit, seat_status, availability_status,
        reservation_expires, reserved_by_session)

flight_seat_availability(flight_id, flight_number, seat_id, seat_number, seat_row, seat_column,
             seat_class, is_window, is_aisle, is_emergency_exit, is_available,
             additional_price, booking_reference)

temporary_seat_reservations(id PK, flight_id, seat_id, session_id, user_id, expires_at, created_at)

seat_bookings(id PK, booking_id, flight_id, seat_id, passenger_name, passenger_email,
          passenger_phone, passenger_document_type DEFAULT 'passport',
          passenger_document_number, passenger_date_of_birth, passenger_nationality, created_at)
```
Uso tipico:
- `temporary_seat_reservations` blocca un posto per session (timeout via `expires_at`).
- Conferma → riga in `seat_bookings` + aggiornamento disponibilità.
- Viste (`flight_seat_map` / `flight_seat_availability`) supportano UI real‑time.

### 10. Relazioni Principali
- accesso (1) → users (1) / airlines (1) tramite FK opzionali
- flights (N) → routes (1) → airports (2) (partenza/arrivo)
- flights (N) → aircrafts (1) → airlines (1)
- bookings (N) → flights (1); bookings (N) → users (1)
- seat_bookings (N) → bookings (1) & flights (1) & seats (aircraft_seats via seat_id)

### 11. Indici Consigliati (principali)
```sql
CREATE INDEX IF NOT EXISTS idx_flights_departure_time ON flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);
CREATE INDEX IF NOT EXISTS idx_flights_route_id ON flights(route_id);
CREATE INDEX IF NOT EXISTS idx_routes_airline_id ON routes(airline_id);
CREATE INDEX IF NOT EXISTS idx_aircrafts_airline_id ON aircrafts(airline_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX IF NOT EXISTS idx_accesso_email ON accesso(email);
```

### 12. Differenze rispetto al precedente README
- Email/password spostate da `users` → `accesso`.
- Aggiunte tabelle granulari per posti (`aircraft_seats`, `flight_seat_*`, `seat_bookings`, `temporary_seat_reservations`).
- Introdotte viste di supporto (`flights_with_airports`, `route_pricing_view`, `booking_details`).
- Prezzi per classe ora gestiti via `route_pricing` invece di campi fissi nella tabella voli.

> Nota: I nomi delle viste possono essere implementati come vere viste SQL o tabelle materializzate a seconda della configurazione di inizializzazione (`database/postgres-init`).

---

## 🚀 Avvio Rapido

### Prerequisiti
- **Docker** e **Docker Compose** (Raccomandato)
- **Node.js 20+** (per sviluppo locale)
- **PostgreSQL 15+** (se non si usa Docker)
- **Git**

### 1. Clona il Repository
```bash
git clone https://github.com/Jk-srt/Progetto-TW.git
cd Progetto-TW
```

### 2. Configura Environment (🆕 Neon Database)
Il progetto è preconfigurato per utilizzare **Neon PostgreSQL** cloud.
Per ragioni di sicurezza NON inserire credenziali reali direttamente nel README o committare `.env`.
Creare un file `.env` nella root del progetto se vuoi personalizzare:

```env
# 🆕 Neon Database (Preconfigurato) - Esempio (sostituire con le proprie credenziali)
DATABASE_URL=postgresql://<NEON_USER>:<NEON_PASSWORD>@<NEON_HOST>/<NEON_DB>?sslmode=require

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_in_production

# 🆕 Admin Account (Default)
ADMIN_EMAIL=admin@tawflights.com
ADMIN_PASSWORD=admin123

# Ports Configuration
FRONTEND_PORT=4200
BACKEND_PORT=3000

# 🆕 Development Mode
NODE_ENV=development
```

### 3. Avvia con Docker (🆕 Setup Ottimizzato)
```bash
# Avvia tutti i servizi
docker-compose up -d

# Controlla i log in tempo reale
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

### 4. Switch Rapido Database (Neon ↔ Locale)

Nel file `docker-compose.yml` sono presenti due righe alternative per `DATABASE_URL` (Neon di default + locale commentata). Per usare il database locale:

1. Commenta la riga Neon e de-commenta quella locale nel servizio `backend`:
  - `# DATABASE_URL=postgresql://neondb_owner...` (commentata)
  - `DATABASE_URL=postgresql://taw_user:taw_password@database:5432/taw_flights`
2. Imposta `DB_SSL=false` (già configurato per locale) oppure `true` per Neon.
3. Se è la prima volta che usi il DB locale ed esiste un volume precedente con utente diverso, rimuovi il volume:
  - `docker volume rm taw_postgres_data` (ATTENZIONE: perderai i dati locali)
4. Ricostruisci: `docker compose up -d --build backend database`.

Per tornare a Neon ripristina la riga con l'URL Neon e rimetti `DB_SSL=true`.

### 5. Script di Avvio Rapido
```bash
# Windows (PowerShell)
.\scripts\start.ps1

# Linux/Mac
chmod +x scripts/start.sh
./scripts/start.sh
```

### 6. Accedi all'Applicazione
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## 🔧 Sviluppo

### Frontend (Angular)
```bash
cd frontend
npm install
npm run dev
```

### Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```

### Database
Il database viene inizializzato automaticamente con:
- Schema completo delle tabelle
- Dati di test (aeroporti, compagnie, aerei, voli)
- Indici per performance ottimali

## 📡 API Endpoints

### 🔐 Autenticazione
- `POST /api/users/register` - Registrazione utente
- `POST /api/users/login` - Login utente

### ✈️ Voli (🆕 Sistema Stato Avanzato)
- `GET /api/flights` - Lista tutti i voli (con vista flights_with_airports) 🆕
- `GET /api/flights/search` - Ricerca voli con filtri stato
- `GET /api/flights/active` - Voli attivi (esclusi cancellati/completati)
- `GET /api/flights/delayed` - Voli in ritardo con delay_minutes 🆕
- `GET /api/flights/cancelled` - Voli cancellati 🆕
- `POST /api/flights` - Crea volo (richiede route_id) 🆕
- `PUT /api/flights/:id` - Aggiorna volo (stato, ritardi) 🆕
- `PUT /api/flights/:id/delay` - Aggiungi ritardo specifico 🆕
- `PUT /api/flights/:id/complete` - Completa volo 🆕
- `PUT /api/flights/:id/cancel` - Cancella volo 🆕
- `DELETE /api/flights/:id` - Elimina volo definitivamente 🆕
- `GET /api/flights/data/routes` - Elenco rotte per dropdown 🆕

### 🛣️ Rotte (🆕 Nuovo Sistema)
- `GET /api/routes` - Lista tutte le rotte
- `GET /api/routes/airline/:airlineId` - Rotte di una specifica compagnia 🆕
- `POST /api/routes` - Crea nuova rotta (admin/airline)
- `PUT /api/routes/:id` - Aggiorna rotta
- `DELETE /api/routes/:id` - Elimina rotta
- `GET /api/routes/:id` - Dettagli rotta specifica

### 🏢 Compagnie Aeree
- `GET /api/airlines` - Lista compagnie aeree
- `GET /api/airlines/:id` - Dettagli compagnia
- `POST /api/airlines` - Crea compagnia (admin)
- `GET /api/airlines/:id/aircrafts` - Aerei della compagnia
- `GET /api/airlines/:id/routes` - Rotte della compagnia 🆕

### 🛩️ Aerei
- `GET /api/aircrafts` - Lista aerei
- `GET /api/aircrafts/:id` - Dettagli aereo
- `POST /api/aircrafts` - Crea aereo (admin)

### 🎫 Prenotazioni
- `POST /api/bookings` - Crea prenotazione
- `GET /api/bookings` - Le mie prenotazioni

### 🔍 Utility
- `GET /api/health` - Health check (restituisce `{ "status": "ok", "uptime": <seconds> }`)
- `GET /api/db-test` - Test connessione database

## 🐳 Docker

### Servizi Disponibili
- **frontend**: Applicazione Angular (porta 4200)
- **backend**: API Node.js (porta 3000)
- **database** (opzionale): PostgreSQL locale per sviluppo (profilo `local`)
  - Di default NON è usato se stai puntando a Neon.
  - Abilitabile con: `docker compose --profile local up -d database`

### Modalità Database

| Modalità | Variabile `DATABASE_URL` | `DB_SSL` | Avvio container `database` | Note |
|----------|--------------------------|---------|----------------------------|------|
| Neon (default) | URL Neon con `sslmode=require` | true | No (può restare fermo) | Produzione / dati condivisi |
| Locale | `postgresql://taw_user:taw_password@database:5432/taw_flights` | false | Sì (`--profile local`) | Sviluppo offline / test |

Cambio rapido:
1. Edita `docker-compose.yml` e commuta la riga `DATABASE_URL` (commenta Neon, decommenta locale o viceversa).
2. Imposta coerentemente `DB_SSL` (true per Neon, false per locale).
3. (Solo prima volta locale) Rimuovi il volume se vuoi rigenerare lo schema: `docker volume rm taw_postgres_data`.
4. Riavvia: `docker compose --profile local up -d --build backend database`.

Per tornare a Neon:
1. Ripristina URL Neon e `DB_SSL=true`.
2. Puoi lasciare il container `database` spento: `docker compose stop database`.

### Connection Pooling / PgBouncer (Opzionale)

Non incluso di default (un vecchio container orfano potrebbe comparire come `taw-pgbouncer`). Se vuoi aggiungerlo:
1. Aggiungi un servizio `pgbouncer` nel `docker-compose.yml`.
2. Modifica `DATABASE_URL` del backend puntando a `postgres://user:pass@pgbouncer:6432/dbname`.
3. Mantieni comunque `DB_SSL=true` se PgBouncer connette verso Neon con SSL.

Esempio snippet (non aggiunto automaticamente):
```yaml
  pgbouncer:
    image: bitnami/pgbouncer:1
    environment:
      - POSTGRESQL_HOST=<neon-host>
      - POSTGRESQL_PORT=5432
      - POSTGRESQL_USERNAME=<user>
      - POSTGRESQL_PASSWORD=<password>
      - POSTGRESQL_DATABASE=<db>
    ports:
      - "6432:6432"
    networks:
      - taw-network
```

### Variabili Chiave Backend
- `DATABASE_URL`: Se definito anche in `.env`, la priorità dipende dall'ordine di caricamento; l'env inline del compose può essere sovrascritto da `env_file`.
- `DB_SSL`: Flag interno per forzare SSL quando l'URL non include `sslmode=require` (Neon già lo include, resta comunque true per coerenza).
- Evitare commit di credenziali reali: usare placeholder e `.env` locale.

### Comandi Utili
```bash
# Riavvia solo il backend
docker-compose restart backend

# Riavvia solo il frontend
docker-compose restart frontend

# Vedi i log del backend
docker-compose logs backend

# Ferma tutti i servizi
docker-compose down

# Ricostruisci e riavvia
docker-compose up --build -d
```

## 🔒 Sicurezza

- **JWT** per autenticazione stateless
- **bcrypt** per hashing password
- **Helmet** per sicurezza headers HTTP
- **CORS** configurato per domini specifici
- **Validazione input** su tutti gli endpoint

## 🛫 Sistema Gestione Stati Voli 🆕

### 📊 Stati Volo Supportati
- **🟢 scheduled**: Volo programmato (prenotabile)
- **🟡 delayed**: Volo in ritardo (prenotabile con avviso)
- **🔴 cancelled**: Volo cancellato (non prenotabile)
- **✅ completed**: Volo completato (archiviato)

### ⏰ Gestione Ritardi Intelligente
Il sistema calcola automaticamente i ritardi e li visualizza in modo intuitivo:

```typescript
// Calcolo automatico ritardo in minuti
const delayMinutes = flight.status === 'delayed' ? 
  calculateDelayFromOriginalTime(flight.departure_time) : 0;

// Visualizzazione badge colorato
const statusBadge = getStatusWithDelay(flight.status, delayMinutes);
```

### 🎨 Indicatori Visivi
- **Badge Stato**: Colori distintivi per ogni stato volo
- **Icone Intuitive**: ✈️ Programmato, ⏰ Ritardato, 🚫 Cancellato, ✅ Completato
- **Range Prezzi**: Visualizzazione "€150 - €300" invece del solo sovrapprezzo
- **Restrizioni Prenotazione**: Pulsanti disabilitati per voli non prenotabili

### 🔧 Pannello Gestione Compagnie
Le compagnie aeree possono:
- **Aggiungere Ritardi**: Selezionare ritardo da 15 minuti a 4 ore
- **Cancellare Voli**: Cambio stato a cancellato (reversibile)
- **Completare Voli**: Segnare voli come completati
- **Modificare Dettagli**: Form completo per aggiornamento voli
- **Eliminazione Definitiva**: Rimozione permanente dal database (con conferma)

### 📈 API Stati Voli
```javascript
// Aggiunta ritardo
PUT /api/flights/:id/delay
{
  "delayMinutes": 30,
  "newDepartureTime": "2025-08-05T11:30:00Z",
  "newArrivalTime": "2025-08-05T13:00:00Z"
}

// Cambio stato
PUT /api/flights/:id/status
{
  "status": "cancelled" | "completed" | "delayed" | "scheduled"
}

// Ricerca per stato
GET /api/flights?status=delayed&includeDelayMinutes=true
```

## 📊 Monitoraggio
## 📚 Funzionalità Complete del Sito

Questa sezione elenca in maniera sistematica tutte le funzionalità attualmente implementate (frontend + backend), organizzate per dominio.

### 1. Autenticazione & Accesso
- Registrazione utente standard
- Login (utente, compagnia, admin) con JWT
- Ruoli supportati: user, airline, admin
- Associazione account airline a `airline_id`
- Forzatura cambio password primo accesso compagnia (guard mustChangePassword)
- Logout client (rimozione token)
- Protezione rotte Angular con guard multipli (role + mustChangePassword + combinato rotte)

### 2. Gestione Compagnie Aeree
- Creazione compagnia (admin) con password temporanea (invito)
- Stato compagnia (active/inactive) con visibilità admin su inattive
- Login compagnia bloccato fino a cambio password iniziale tramite flag `must_change_password`
- Selezione compagnie inattive evidenziate nel pannello voli
- Eliminazione avanzata (hard se nessun volo, soft altrimenti, `?force=true` per rimuovere credenziali)

### 3. Gestione Rotte
- CRUD rotte (admin + airline proprietaria)
- Filtra rotte per compagnia
- Calcolo distanza / durata salvati sulla rotta
- Stato rotta (active)
- Vista arricchita prezzi per classe (`route_pricing_view`)

### 4. Prezzi & Pricing Dinamico
- Prezzo base da rotta + sovrapprezzo compagnia
- Prezzi per classi (economy/business/first) derivati
- Endpoint pricing rotte dedicato

### 5. Gestione Aerei & Posti
- CRUD aerei (admin / airline)
- Generazione / import layout posti (`aircraft_seats`)
- Vista mappa posti per volo (`flight_seat_map` / `flight_seat_availability`)
- Attributi posto: finestrino, corridoio, uscita emergenza, classe
- Stato posto (available / reserved / blocked)

### 6. Sistema Voli
- Creazione voli legati a rotta + aereo + compagnia
- Stati supportati: scheduled, delayed, cancelled, completed
- Aggiornamento stato con endpoint dedicati
- Gestione ritardi (ritardo minuti + aggiornamento orari)
- Calcolo prezzi finali per classe via vista
- Ricerca voli (per aeroporto, rotta, stato)
- Visualizzazione range prezzi nel frontend

### 7. Ricerca & UX Voli
- Ricerca one-way senza data obbligatoria
- Dropdown aeroporti con etichetta “Nome - Città (CODICE)” e value compatibile backend
- Filtri per stato / compagnia / rotta (frontend + backend)
- Visual indicator stati (badge colorati + icone)

### 8. Prenotazioni
- Creazione prenotazione volo con selezione posto
- Visualizzazione prenotazioni utente
- Cancellazione prenotazione (>24h prima partenza) con rilascio posto
- Tracking stato prenotazione (confirmed / cancelled)
- Dettagli booking denormalizzati (`booking_details`)
- Prezzo visualizzato comprensivo di extra supportati
- Extra itemizzati tramite tabella `booking_extras` (baggage, priority_boarding, premium_meal)
- Rimozione visualizzazione extra deprecati (extra_legroom, preferred_seat)

### 9. Gestione Selezione Posti (Seat Reservation Layer)
- Lock temporaneo posto (tabella `temporary_seat_reservations` con scadenza)
- Conferma converte lock in `seat_bookings`
- Aggiornamento disponibilità posti volo e contatore seats
- Mappa posti compatta / espansa (toggle UI)

### 10. Sicurezza
- Hash password con bcrypt
- JWT stateless + middleware validazione
- Helmet + CORS configurati
- Guard ruoli in backend per endpoint protetti

### 11. Monitoraggio & Logging
- Endpoint health `/api/health`
- Endpoint test DB `/api/db-test`
- Logging HTTP con Morgan
- Log diagnostici per errori CRUD rotte/voli/prenotazioni

### 12. Gestione Errori & UX Feedback
- Messaggi utente per azioni critiche (cancellazione volo / ritardo / prenotazione)
- Pulsanti disabilitati in base a stato volo/posto
- Spinner / loader nelle viste prenotazioni

### 13. Amministrazione
- Dashboard admin riepilogo
- Pannello voli (admin + airline) con filtri avanzati
- Gestione rotte dedicata
- Gestione aerei (manutenzione / stato)

### 14. Ottimizzazioni Performance
- Indici su campi chiave (route_id, departure_time, status, airline_id)
- Connection pooling lato backend
- Viste aggregate per ridurre join ripetuti

### 15. Architettura & DevOps
- Docker Compose (frontend, backend, db)
- Script start cross-platform (sh/ps1)
- Multi-stage Docker build
- Inizializzazione DB automatica script SQL

### 16. Accessibilità & UI
- Contrasto elevato nei pulsanti azione
- Stato disabilitato chiaro per azioni non permesse
- Layout responsive grid per form ricerca voli

### 17. Funzionalità Rimosse / Pianificate
- Rimosso: download dati personali (bottone placeholder eliminato)
- Rimosso: visualizzazione extra_legroom / preferred_seat nelle prenotazioni (deprecati)
- Pianificato: data export strutturato (JSON + zip), pagamenti, PWA, real-time notifiche

> Se una funzionalità risultasse non più presente, aggiornare questa lista contestualmente alla modifica del codice.

- Health check endpoints disponibili
- Logging dettagliato con Morgan
- Error handling centralizzato
- Debug mode per sviluppo

## 🤝 Contribuire

1. Fork il progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Changelog

### 🆕 Versione 3.3.0 - Inviti Compagnie & Booking Extras (Settembre 2025)
Novità principali:
- Registrazione compagnie solo tramite admin (invito) con password temporanea
- Flag `must_change_password` e attivazione airline post cambio password
- Endpoint eliminazione compagnie con soft/hard delete e parametro `force`
- Prezzo prenotazioni aggiornato lato UI con somma extra supportati
- Pulizia extra deprecati dalla UI
- Migliorata trasparenza risposte API con campo `action` per delete compagnie

### Versione 3.2.0 - UX Prenotazioni & Compagnie (Agosto 2025)
Principali novità (riassunto della sezione iniziale):
- Cancellazione prenotazioni lato utente (>24h) con rilascio posto atomico
- Dashboard prenotazioni airline con tabs metriche / mappa posti / distribuzione classi
- Ricerca voli semplificata one-way e caricamento aeroporti dinamico
- Navigazione diretta verso selezione posti per voli diretti
- Mappa posti compatta (toggle) e miglioramenti accessibilità
- UI ruoli: airline nascosti pulsanti prenotazione
- Gestione rotte robusta (aggiornamenti parziali via COALESCE)
- Logging diagnostico esteso frontend/backend

### Versione 3.1.0 - Sistema Stati Voli Avanzato (Agosto 2025)
#### 🚨 Gestione Stati Completa
- **✅ Stati Dinamici**: Sistema completo scheduled/delayed/cancelled/completed con logica avanzata
- **✅ Calcolo Ritardi**: Visualizzazione automatica minuti di ritardo per voli delayed
- **✅ Restrizioni Smart**: Voli cancellati non prenotabili, delayed con avvisi utente
- **✅ Badge Colorati**: Indicatori visivi intuitivi per ogni stato volo

#### 🎨 UX/UI Migliorata
- **✅ Prezzi Reali**: Range "€150-€300" invece del solo sovrapprezzo nella gestione admin
- **✅ Pannello Ritardi**: Modal dedicato per aggiungere ritardi con preview orari
- **✅ Azioni Contestuali**: Pulsanti dinamici basati su stato volo (Completa/Cancella/Ritarda)
- **✅ Conferme Sicurezza**: Dialog di conferma per azioni critiche (elimina definitivo)

#### ⚡ Backend Ottimizzato
- **✅ API Stati**: Endpoint dedicati per gestione stati e ritardi voli
- **✅ Calcoli Dinamici**: Delay_minutes e prezzi calcolati automaticamente nella vista DB
- **✅ Validazioni**: Controlli business logic per transizioni stati valide
- **✅ Error Handling**: Gestione errori migliorata con messaggi utente chiari

### Versione 3.0.0 - Sistema Rotte (Agosto 2025)
#### 🛣️ Architettura Normalizzata
- **✅ Nuovo Sistema Rotte**: Implementazione completa tabella `routes` per normalizzazione database
- **✅ Migrazione Database**: Script automatico per migrazione da aeroporti diretti a sistema rotte
- **✅ Vista Compatibilità**: `flights_with_airports` per mantenere retrocompatibilità
- **✅ API Rotte**: Endpoint completi per gestione CRUD rotte per compagnie aeree

#### 🎯 Frontend Ottimizzato
- **✅ Dropdown Rotte**: Sostituzione dropdown aeroporti con selezione rotte nel form voli
- **✅ Filtro Compagnia**: Le compagnie vedono solo le proprie rotte autorizzate
- **✅ Ricerca Estesa**: Aggiunta ricerca per nome rotta nei filtri
- **✅ RouteAdminService**: Nuovo servizio Angular per gestione rotte

#### ⚡ Performance e Sicurezza
- **✅ Indici Ottimizzati**: Nuovi indici database per query rotte performanti
- **✅ Autorizzazioni**: Controllo accesso rotte per compagnia specifica
- **✅ Gestione Errori**: Fallback automatico con filtro lato client
- **✅ Logging Dettagliato**: Debug avanzato per troubleshooting

### Versione 2.0.0 - Flight Management (Luglio 2025)
- ✅ Flight Admin Panel completo per compagnie aeree
- ✅ Sistema autenticazione multi-ruolo (user/admin/airline)
- ✅ Database cloud Neon PostgreSQL
- ✅ API RESTful complete per tutte le entità
- ✅ Docker ottimizzato per sviluppo

### Versione 1.0.0 - MVP (Giugno 2025)
- ✅ Frontend Angular con visualizzazione voli
- ✅ Backend Node.js/Express
- ✅ Sistema prenotazioni base
- ✅ Database PostgreSQL locale

## 📝 License

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 👨‍💻 Autori

- **Federico Riato** - Progetto Tecnologie Web
- **Alessandro Sartori** - Progetto Tecnologie Web  
- **Federico Vedovotto** - Progetto Tecnologie Web


## 🔮 Roadmap Future

### 🎯 Prossime Implementazioni (v3.1)
- [ ] **🪑 Sistema Selezione Posti**: Mappa interattiva aereo con prenotazione posti specifici
- [ ] **💳 Integrazione Pagamenti**: Gateway di pagamento per prenotazioni e servizi premium
- [ ] **📱 PWA**: Progressive Web App per esperienza mobile nativa
- [ ] **🔔 Notifiche Real-time**: WebSocket per aggiornamenti stato voli e gate changes

### 🚀 Funzionalità Avanzate (v4.0)
- [ ] **🧠 ML Pricing**: Algoritmi di machine learning per pricing dinamico
- [ ] **📊 Analytics Dashboard**: Dashboard avanzata con metriche dettagliate
- [ ] **🌍 Multi-lingua**: Supporto multilingua con i18n
- [ ] **🎫 Digital Boarding Pass**: QR code e NFC per check-in digitale

### 🔧 Ottimizzazioni Tecniche
- [ ] **⚡ Redis Caching**: Sistema di caching distribuito per performance
- [ ] **🛡️ Rate Limiting**: Protezione API con limite richieste
- [ ] **🔄 Microservizi**: Architettura microservizi per scalabilità
- [ ] **📱 App Mobile**: React Native per iOS e Android

### 🌟 Funzionalità Premium
- [ ] **✈️ Fleet Management**: Gestione completa flotta aerei
- [ ] **👥 Crew Management**: Sistema gestione equipaggi
- [ ] **🛠️ Maintenance Tracking**: Tracking manutenzioni preventive
- [ ] **📈 Revenue Management**: Ottimizzazione ricavi e load factor

---

<div align="center">
  <p>Fatto con ❤️ per il corso di Tecnologie Web</p>
  <p>⭐ Lascia una stella se ti è piaciuto il progetto!</p>
</div>