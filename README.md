# ✈️ TAW Flights - Sistema di Gestione Voli

Un sistema completo per la gestione e prenotazione di voli sviluppato con tecnologie moderne. Il progetto include un frontend Angular, un backend Node.js/TypeScript e un database PostgreSQL con integrazione cloud Neon.

![TAW Flights](https://img.shields.io/badge/Version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)
![Angular](https://img.shields.io/badge/Angular-17+-red.svg)
![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)

## 🚀 Caratteristiche Principali

### 🎯 Funzionalità Core
- **Gestione Voli Completa**: Visualizzazione, ricerca, filtraggio e amministrazione voli
- **Sistema di Amministrazione Voli**: Pannello dedicato per compagnie aeree con gestione CRUD completa
- **Autenticazione Multi-Ruolo**: Sistema JWT con utenti, admin e compagnie aeree
- **Dashboard Compagnie**: Interfaccia dedicata per la gestione dei voli delle compagnie
- **Sistema Prenotazioni**: Prenotazione voli con gestione posti e tracking
- **Database Cloud**: Integrazione con Neon PostgreSQL per performance ottimali
- **API RESTful Completa**: Endpoints per tutte le operazioni CRUD

### 🆕 Nuove Funzionalità (v3.0) - Sistema Rotte
- **�️ Gestione Rotte**: Sistema normalizzato con rotte predefinite per le compagnie aeree
- **� Architettura Normalizzata**: I voli ora utilizzano route_id invece di aeroporti separati
- **🏢 Rotte per Compagnia**: Ogni compagnia aerea gestisce solo le proprie rotte autorizzate
- **🎯 Selezione Intelligente**: Il form di creazione voli mostra solo le rotte della propria compagnia
- **📊 Compatibilità Retroattiva**: Vista database flights_with_airports per mantenere compatibilità
- **� Ricerca Estesa**: Filtri di ricerca includono anche i nomi delle rotte
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
│   │       │   ├── flight-admin.component.ts     # 🆕 Admin panel voli
│   │       │   ├── user-login.component.ts
│   │       │   ├── airline-login.component.ts    # 🆕 Login compagnie
│   │       │   ├── user-register.component.ts
│   │       │   ├── bookings.component.ts
│   │       │   ├── settings.component.ts
│   │       │   ├── flight-card/                  # Card componente volo
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
│   │   │   ├── pool.ts         # 🆕 Connection pooling
│   │   │   └── poll.ts         # Database polling
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

## 🗄️ Schema Database (Neon PostgreSQL)

### Tabelle Principali

#### 👥 users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user',
    airline_id INTEGER REFERENCES airlines(id),
    airline_name VARCHAR(255),
    temporary_password BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- **Ruoli**: `user`, `admin`, `airline`
- **Autenticazione**: JWT con password hash bcrypt
- **🆕 Collegamento compagnie**: Utenti airline collegati alle compagnie

#### ✈️ flights (🆕 Tabella Ottimizzata con Rotte)
```sql
CREATE TABLE flights (
    id SERIAL PRIMARY KEY,
    flight_number VARCHAR(10) NOT NULL,
    airline_id INTEGER REFERENCES airlines(id),
    aircraft_id INTEGER REFERENCES aircrafts(id),
    route_id INTEGER REFERENCES routes(id), -- 🆕 NUOVO: Collegamento alle rotte
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- **🆕 Sistema Rotte**: I voli ora utilizzano `route_id` invece di aeroporti separati
- **Stati**: `scheduled`, `delayed`, `cancelled`, `completed`, `boarding`, `departed`
- **🆕 Relazioni complete**: Collegamenti a airlines, aircrafts tramite rotte
- **🆕 Gestione posti**: Posti totali e disponibili

#### 🛣️ routes (🆕 Tabella Rotte)
```sql
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    departure_airport_id INTEGER REFERENCES airports(id),
    arrival_airport_id INTEGER REFERENCES airports(id),
    airline_id INTEGER REFERENCES airlines(id),
    distance_km INTEGER,
    estimated_duration VARCHAR(10),
    default_price DECIMAL(10,2),
    business_price DECIMAL(10,2),
    first_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- **🆕 Normalizzazione**: Rotte predefinite per ogni compagnia aerea
- **🆕 Pricing Stratificato**: Prezzi per classe di servizio
- **🆕 Metadati**: Distanza e durata stimata
- **🆕 Stato**: Attiva/Inattiva per gestione operativa

#### 🏢 airlines (🆕 Compagnie Aeree Complete)
```sql
CREATE TABLE airlines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    iata_code VARCHAR(3) UNIQUE,
    icao_code VARCHAR(4) UNIQUE,
    country VARCHAR(100),
    founded_year INTEGER,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- **Codici Standard**: IATA e ICAO
- **🆕 Metadati**: Fondazione, sito web, logo
- **🆕 Stato**: Attivo/Inattivo

#### 🛩️ aircrafts (🆕 Flotta Aerei)
```sql
CREATE TABLE aircrafts (
    id SERIAL PRIMARY KEY,
    airline_id INTEGER REFERENCES airlines(id),
    registration VARCHAR(20) UNIQUE NOT NULL,
    aircraft_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100) NOT NULL,
    seat_capacity INTEGER NOT NULL,
    business_class_seats INTEGER DEFAULT 0,
    economy_class_seats INTEGER,
    manufacturing_year INTEGER,
    last_maintenance DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- **🆕 Dettagli Tecnici**: Produttore, modello, capacità
- **🆕 Classi di Servizio**: Business e Economy
- **🆕 Manutenzione**: Tracking ultimo intervento

#### 🏛️ airports (🆕 Aeroporti Mondiali)
```sql
CREATE TABLE airports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    iata_code VARCHAR(3) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- **🆕 Geolocalizzazione**: Coordinate GPS
- **🆕 Codici Standard**: IATA per identificazione

#### 🎫 bookings (Sistema Prenotazioni)
```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    flight_id INTEGER REFERENCES flights(id),
    passenger_name VARCHAR(255) NOT NULL,
    passenger_email VARCHAR(255) NOT NULL,
    seat_number VARCHAR(10),
    booking_status VARCHAR(20) DEFAULT 'confirmed',
    total_price DECIMAL(10,2) NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(20) DEFAULT 'pending'
);
```
- **🆕 Tracking Completo**: Passeggero, posto, pagamento
- **🆕 Stati**: Confermato, Annullato, Check-in, Completato
### 🔗 Relazioni Database
- **users** ↔ **airlines**: Utenti collegati alle compagnie (1:N)
- **flights** ↔ **routes**: Voli operano su rotte predefinite (N:1) 🆕
- **routes** ↔ **airlines**: Rotte gestite dalle compagnie (N:1) 🆕
- **routes** ↔ **airports**: Aeroporti di partenza e arrivo delle rotte (N:1) 🆕
- **flights** ↔ **aircrafts**: Aerei utilizzati per i voli (N:1)
- **bookings** ↔ **users**: Prenotazioni degli utenti (N:1)
- **bookings** ↔ **flights**: Prenotazioni sui voli (N:1)
- **aircrafts** ↔ **airlines**: Flotta delle compagnie (N:1)

### 🎯 Vista Compatibilità (flights_with_airports) 🆕
```sql
CREATE VIEW flights_with_airports AS
SELECT 
    f.*,
    r.route_name,
    r.distance_km,
    r.estimated_duration as route_duration,
    da.name as departure_airport,
    da.iata_code as departure_code,
    da.city as departure_city,
    aa.name as arrival_airport,
    aa.iata_code as arrival_code,
    aa.city as arrival_city,
    al.name as airline_name,
    al.iata_code as airline_code,
    ac.registration as aircraft_registration,
    ac.aircraft_type,
    ac.model as aircraft_model
FROM flights f
JOIN routes r ON f.route_id = r.id
JOIN airports da ON r.departure_airport_id = da.id
JOIN airports aa ON r.arrival_airport_id = aa.id
JOIN airlines al ON f.airline_id = al.id
JOIN aircrafts ac ON f.aircraft_id = ac.id;
```
- **🆕 Compatibilità Retroattiva**: Mantiene le informazioni degli aeroporti per i componenti esistenti
- **🆕 Dati Arricchiti**: Include informazioni complete di rotte, aeroporti, compagnie e aerei
- **🆕 Performance**: Un'unica query per ottenere tutti i dati necessari

### 🚀 Indici e Performance
```sql
-- Indici ottimizzati per query frequenti
CREATE INDEX idx_flights_departure_time ON flights(departure_time);
CREATE INDEX idx_flights_airline_id ON flights(airline_id);
CREATE INDEX idx_flights_route_id ON flights(route_id); -- 🆕 NUOVO
CREATE INDEX idx_flights_status ON flights(status);
CREATE INDEX idx_routes_airline_id ON routes(airline_id); -- 🆕 NUOVO
CREATE INDEX idx_routes_departure_airport ON routes(departure_airport_id); -- 🆕 NUOVO
CREATE INDEX idx_routes_arrival_airport ON routes(arrival_airport_id); -- 🆕 NUOVO
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX idx_aircrafts_airline_id ON aircrafts(airline_id);
```

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
Crea un file `.env` nella root del progetto se vuoi personalizzare:

```env
# 🆕 Neon Database (Preconfigurato)
DATABASE_URL=postgresql://neondb_owner:9IrmP6f6XaFO@ep-weathered-darkness-a5ytvuoe.us-east-2.aws.neon.tech/neondb?sslmode=require

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

### 4. Script di Avvio Rapido
```bash
# Windows (PowerShell)
.\scripts\start.ps1

# Linux/Mac
chmod +x scripts/start.sh
./scripts/start.sh
```

### 4. Accedi all'Applicazione
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

### ✈️ Voli
- `GET /api/flights` - Lista tutti i voli (con vista flights_with_airports) 🆕
- `GET /api/flights/search` - Ricerca voli
- `GET /api/flights/active` - Voli attivi
- `GET /api/flights/on-time` - Voli in orario
- `POST /api/flights` - Crea volo (richiede route_id) 🆕
- `PUT /api/flights/:id` - Aggiorna volo 🆕
- `DELETE /api/flights/:id` - Elimina volo 🆕
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
- `GET /api/health` - Health check
- `GET /api/db-test` - Test connessione database

## 🐳 Docker

### Servizi Disponibili
- **frontend**: Applicazione Angular (porta 4200)
- **backend**: API Node.js (porta 3000)

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

## 📊 Monitoraggio

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

### 🆕 Versione 3.0.0 - Sistema Rotte (Agosto 2025)
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

### 📊 Versione 2.0.0 - Flight Management (Luglio 2025)
- ✅ Flight Admin Panel completo per compagnie aeree
- ✅ Sistema autenticazione multi-ruolo (user/admin/airline)
- ✅ Database cloud Neon PostgreSQL
- ✅ API RESTful complete per tutte le entità
- ✅ Docker ottimizzato per sviluppo

### 🚀 Versione 1.0.0 - MVP (Giugno 2025)
- ✅ Frontend Angular con visualizzazione voli
- ✅ Backend Node.js/Express
- ✅ Sistema prenotazioni base
- ✅ Database PostgreSQL locale

## 📝 License

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 👨‍💻 Autore

**Federico Riato** - Progetto Tecnologie Web
**Alessandro Sartori** - Progetto Tecnologie Web
**Federico Vedovotto** - Progetto Tecnologie Web


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