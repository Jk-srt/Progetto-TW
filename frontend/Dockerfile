# Stage 1: Development
FROM node:20-alpine AS development

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --legacy-peer-deps
RUN chown -R nodejs:nodejs /app
USER nodejs

COPY --chown=nodejs:nodejs . .

EXPOSE 4200

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]

# Stage 2: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY angular.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

# Stage 3: Production with Nginx
FROM nginx:alpine AS production

# Copia i file buildati dal stage di build
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copia la configurazione nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
