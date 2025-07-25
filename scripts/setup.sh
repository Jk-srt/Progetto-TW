#!/bin/bash

echo "🔧 Setup del progetto TAW con PostgreSQL..."

# Naviga nella directory backend
cd backend

echo "📦 Installazione dipendenze backend..."
npm install

echo "🗄️  Inizializzazione database PostgreSQL..."
echo "ℹ️  Assicurati che la variabile DATABASE_URL sia configurata nel file .env"

# Verifica se psql è disponibile per eseguire lo script SQL
if command -v psql &> /dev/null; then
    echo "🔨 Esecuzione script di inizializzazione database..."
    psql "$DATABASE_URL" -f database/init.sql
    if [ $? -eq 0 ]; then
        echo "✅ Database inizializzato con successo!"
    else
        echo "⚠️  Errore durante l'inizializzazione del database"
        echo "💡 Puoi eseguire manualmente il file database/init.sql nel tuo database PostgreSQL"
    fi
else
    echo "⚠️  psql non trovato. Esegui manualmente il file database/init.sql nel tuo database PostgreSQL"
fi

# Torna alla directory principale
cd ..

# Naviga nella directory frontend
cd frontend

echo "📦 Installazione dipendenze frontend..."
npm install

# Torna alla directory principale
cd ..

echo ""
echo "✅ Setup completato!"
echo "🚀 Per avviare il progetto: ./scripts/start.sh"
echo "🗄️  Per inizializzare il database manualmente:"
echo "   psql [DATABASE_URL] -f backend/database/init.sql"
