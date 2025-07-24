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
