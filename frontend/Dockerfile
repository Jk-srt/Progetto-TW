# Stage 1: Development
FROM node:20-alpine AS development

# Installa dumb-init per gestire correttamente i segnali
RUN apk add --no-cache dumb-init

# Crea utente non-root per sicurezza
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di dipendenze prima del codice per ottimizzare la cache
COPY package*.json ./
COPY tsconfig.json ./

# Cambia proprietario e installa dipendenze
RUN chown -R nodejs:nodejs /app
USER nodejs

# Installa dipendenze con cache mount per velocizzare i rebuild
RUN npm ci --legacy-peer-deps

# Copia il codice sorgente
COPY --chown=nodejs:nodejs ./src ./src

# Esponi la porta
EXPOSE 3000
EXPOSE 4200

# Usa dumb-init per gestire correttamente i segnali
ENTRYPOINT ["dumb-init", "--"]

# Comando per sviluppo con hot reload
CMD ["npm", "run", "dev", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000", "--disable-host-check"]
