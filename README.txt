Progetto Tecnologie Web – Istruzioni Avvio Rapido

1. Requisiti
- Docker + Docker Compose
- (Opzionale per sviluppo non container) Node.js 20+, npm

2. Clonazione
 git clone <repo-url>
 cd Progetto-TW

3. Configurazione Ambiente
 Copia .env.example in .env e imposta:
  DATABASE_URL= (Neon oppure locale: postgresql://taw_user:taw_password@database:5432/taw_flights)
  DB_SSL=true (Neon) oppure false (locale)
 Altre variabili: ENABLE_FLIGHT_STATUS_JOB (opzionale), FLIGHT_STATUS_INTERVAL_MS

4. Avvio Standard (Neon default)
 docker compose up -d --build
 Frontend: http://localhost:4200
 Backend:  http://localhost:3000
 Health:   http://localhost:3000/api/health

5. Passaggio a Database Locale
 - Modifica docker-compose.yml sostituendo DATABASE_URL con quella locale
 - Imposta DB_SSL=false
 - Avvia servizio DB locale (profilo):
   docker compose --profile local up -d database backend frontend
 - (Se necessario) reset volume: docker volume rm taw_postgres_data

6. Script Rapidi
 Windows:  scripts\start.ps1
 Linux/Mac: chmod +x scripts/start.sh && scripts/start.sh

7. Login Demo (se presenti dati seed)
 - Admin:    admin@example.com / <password_seed>
 - Airline:  airline@example.com / <password_seed> (forza cambio password al primo accesso)
 - Utente:   user@example.com / <password_seed>

8. Comandi Utili
 docker compose logs -f backend
 docker compose restart backend
 docker compose down
 docker compose up --build -d

9. Generazione PDF Report
 Richiede pandoc:
  pandoc REPORT_Jk-srt.md -o Cognome_Nome_Matricola.pdf
 (Ripetere per ciascun report, sostituendo la matricola prima)

10. Struttura Consegna
 - Tutto il codice sorgente (frontend, backend, database, scripts)
 - README.md (dettagli estesi)
 - README.txt (questo file)
 - REPORT_*.md + PDF generati

Note: Non committare credenziali reali. Usare placeholder nel .env.
