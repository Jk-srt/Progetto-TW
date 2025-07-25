# Progetto TAW - Architettura Frontend

## 📁 Struttura del Progetto

```
frontend/src/app/
├── components/
│   ├── welcome-section/
│   │   ├── welcome-section.component.ts
│   │   └── welcome-section.component.scss
│   ├── stats-section/
│   │   ├── stats-section.component.ts
│   │   └── stats-section.component.scss
│   ├── flight-filters/
│   │   ├── flight-filters.component.ts
│   │   └── flight-filters.component.scss
│   ├── flight-card/
│   │   ├── flight-card.component.ts
│   │   └── flight-card.component.scss
│   ├── flights-grid/
│   │   ├── flights-grid.component.ts
│   │   └── flights-grid.component.scss
│   ├── home.component.ts
│   └── home.component.scss
├── models/
│   └── flight.model.ts
├── services/
│   └── flight.service.ts
├── app.ts
├── app.html
├── app.scss
├── app.module.ts
└── app-routing-module.ts
```

## 🎯 Principi di Design

### 1. **Single Responsibility Principle**
Ogni componente ha una responsabilità specifica:
- `WelcomeSectionComponent`: Visualizza messaggio di benvenuto
- `StatsSectionComponent`: Mostra statistiche dei voli
- `FlightFiltersComponent`: Gestisce filtri di ricerca
- `FlightCardComponent`: Visualizza singolo volo
- `FlightsGridComponent`: Layout griglia voli
- `HomeComponent`: Orchestratore principale

### 2. **Standalone Components**
Tutti i componenti sono standalone per:
- ✅ Migliori performance
- ✅ Lazy loading più efficace
- ✅ Bundle size ridotto
- ✅ Dependency management chiaro

### 3. **Separation of Concerns**
- **Models**: Definizione tipi e interfacce
- **Services**: Logica business e data management
- **Components**: UI e presentazione
- **Styles**: CSS modulare per componente

## 🔧 Componenti

### WelcomeSectionComponent
```typescript
// Componente per la sezione di benvenuto
@Input() - Nessuno
@Output() - Nessuno
```

### StatsSectionComponent
```typescript
// Visualizza statistiche in formato card
@Input() stats: StatCard[]
```

### FlightFiltersComponent
```typescript
// Gestisce filtri per tipologia voli
@Input() selectedFilter: FilterType
@Input() title: string
@Output() filterChange: EventEmitter<FilterType>
```

### FlightCardComponent
```typescript
// Card singolo volo con informazioni complete
@Input() flight: Flight
```

### FlightsGridComponent
```typescript
// Container per visualizzazione lista voli
@Input() flights: Flight[]
```

## 📦 Services

### FlightService
```typescript
// Gestione dati voli con pattern Observable
getFlights(): Observable<Flight[]>
getFlightById(id: string): Observable<Flight | undefined>
getActiveFlights(): Observable<Flight[]>
getOnTimeFlights(): Observable<Flight[]>
filterFlights(filterType): Observable<Flight[]>
```

## 🎨 Styling Architecture

### File SCSS Modulari
- Ogni componente ha il proprio file `.scss`
- Variabili globali definite in `styles.scss`
- Responsive design mobile-first
- Utilizzo di CSS Grid e Flexbox

### Design System
- **Colori**: Palette coerente (#667eea, #764ba2, #2c3e50)
- **Typography**: Font weights e sizes standardizzati
- **Spacing**: Sistema basato su rem
- **Animations**: Transizioni fluide 0.3s ease

## 🚀 Vantaggi della Nuova Architettura

### ✅ Manutenibilità
- Componenti piccoli e focalizzati
- Debugging più facile
- Testing isolato per componente

### ✅ Riusabilità
- Componenti standalone riutilizzabili
- Interfacce TypeScript tipizzate
- Separazione logica/presentazione

### ✅ Performance
- Lazy loading ottimizzato
- Bundle splitting automatico
- Change detection efficiente

### ✅ Scalabilità
- Aggiunta nuovi componenti semplificata
- Pattern architetturale consistente
- Dependency injection pulita

## 🛠️ Comandi di Sviluppo

```bash
# Avvio progetto
./scripts/start.ps1

# Building
docker compose build frontend

# Logs
docker compose logs frontend -f

# Testing
ng test

# Linting
ng lint
```

## 📝 Note per Sviluppatori

1. **Seguire naming convention**: kebab-case per file, PascalCase per classi
2. **Utilizzare TypeScript strict mode** per type safety
3. **Implementare error handling** nei services
4. **Documentare componenti pubblici** con JSDoc
5. **Testare responsive design** su diverse risoluzioni

## 🎯 Prossimi Sviluppi

- [ ] Implementazione routing avanzato
- [ ] Aggiunta state management (NgRx)
- [ ] Integrazione backend API
- [ ] Testing automatizzato (Jest/Cypress)
- [ ] PWA capabilities
- [ ] Internationalization (i18n)
