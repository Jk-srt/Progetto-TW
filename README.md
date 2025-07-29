# ✈️ TAW Flights - Sistema di Gestione Voli

Un sistema completo per la gestione e prenotazione di voli sviluppato con tecnologie moderne. Il progetto include un frontend Angular, un backend Node.js/TypeScript e un database PostgreSQL.

![TAW Flights](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)
![Angular](https://img.shields.io/badge/Angular-17+-red.svg)
![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)

## 🚀 Caratteristiche Principali

### 🎯 Funzionalità Core
- **Gestione Voli**: Visualizzazione, ricerca e filtraggio voli
- **Sistema Prenotazioni**: Prenotazione voli con gestione posti
- **Autenticazione**: Sistema di login/registrazione con JWT
- **Compagnie Aeree**: Gestione completa delle compagnie aeree
- **Flotta Aerei**: Database degli aerei con dettagli tecnici
- **Dashboard**: Pannello di controllo per amministratori

### 🔧 Tecnologie Utilizzate

#### Frontend
- **Angular 17+** - Framework principale
- **TypeScript** - Linguaggio di sviluppo
- **SCSS** - Preprocessore CSS
- **Standalone Components** - Architettura moderna Angular

#### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Linguaggio tipizzato
- **PostgreSQL** - Database relazionale
- **JWT** - Autenticazione token-based
- **bcrypt** - Hashing password

#### DevOps & Tools
- **Docker & Docker Compose** - Containerizzazione
- **Neon Database** - Database cloud PostgreSQL
- **Nodemon** - Auto-reload development
- **CORS** - Cross-origin resource sharing

## 📁 Struttura del Progetto

```
Progetto-TW/
├── 📁 frontend/                 # Applicazione Angular
│   ├── 📁 src/
│   │   ├── 📁 app/
│   │   │   ├── 📁 components/   # Componenti UI
│   │   │   │   ├── flight-card/
│   │   │   │   ├── flight-filters/
│   │   │   │   ├── flights-grid/
│   │   │   │   └── stats-section/
│   │   │   ├── 📁 models/       # Interfacce TypeScript
│   │   │   └── 📁 services/     # Servizi Angular
│   │   └── 📁 public/           # Asset statici
│   ├── angular.json
│   ├── package.json
│   └── Dockerfile
├── 📁 backend/                  # API Node.js
│   ├── 📁 src/
│   │   ├── app.ts              # Server principale
│   │   └── 📁 models/          # Modelli database
│   ├── 📁 database-init/       # Script inizializzazione DB
│   ├── package.json
│   └── Dockerfile
├── 📁 database/                 # Configurazione database
│   └── 📁 postgres-init/
│       └── init.sql            # Schema database
├── 📁 scripts/                 # Script di utilità
├── docker-compose.yml          # Orchestrazione container
└── README.md
```

## 🗄️ Schema Database

### Tabelle Principali

#### 👥 Users
- Gestione utenti con ruoli (user, admin, airlines)
- Autenticazione sicura con password hash

#### ✈️ Flights
- Informazioni complete sui voli
- Collegamenti a compagnie aeree e aerei specifici
- Gestione posti disponibili

#### 🏢 Airlines (Compagnie Aeree)
- Database delle compagnie aeree
- Codici IATA/ICAO
- Informazioni dettagliate

#### 🛩️ Aircrafts (Aerei)
- Flotta aerei per compagnia
- Specifiche tecniche (capacità, produttore, modello)
- Stato di manutenzione

#### 🎫 Bookings
- Sistema di prenotazioni
- Tracking passeggeri
- Gestione stati prenotazione

#### 🏛️ Airports
- Database aeroporti mondiali
- Coordinate geografiche
- Codici IATA

## 🚀 Avvio Rapido

### Prerequisiti
- **Docker** e **Docker Compose**
- **Node.js 20+** (per sviluppo locale)
- **Git**

### 1. Clona il Repository
```bash
git clone https://github.com/Jk-srt/Progetto-TW.git
cd Progetto-TW
```

### 2. Configura Environment
Crea un file `.env` nella root del progetto:
```env
# Database
DATABASE_URL=your_postgresql_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Admin Account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin_password

# Ports
FRONTEND_PORT=4200
BACKEND_PORT=3000
```

### 3. Avvia con Docker
```bash
# Avvia tutti i servizi
docker-compose up -d

# Controlla i log
docker-compose logs -f
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
- `GET /api/flights` - Lista tutti i voli
- `GET /api/flights/search` - Ricerca voli
- `GET /api/flights/active` - Voli attivi
- `GET /api/flights/on-time` - Voli in orario

### 🏢 Compagnie Aeree
- `GET /api/airlines` - Lista compagnie aeree
- `GET /api/airlines/:id` - Dettagli compagnia
- `POST /api/airlines` - Crea compagnia (admin)
- `GET /api/airlines/:id/aircrafts` - Aerei della compagnia

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

## 📝 License

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 👨‍💻 Autore

**Federico** - Progetto Tecnologie Web

## 🔮 Roadmap Future

- [ ] Sistema di notifiche real-time
- [ ] Integrazione pagamenti
- [ ] App mobile React Native
- [ ] Dashboard analytics avanzata
- [ ] API rate limiting
- [ ] Sistema di caching Redis
- [ ] Microservizi architecture

---

<div align="center">
  <p>Fatto con ❤️ per il corso di Tecnologie Web</p>
  <p>⭐ Lascia una stella se ti è piaciuto il progetto!</p>
</div>