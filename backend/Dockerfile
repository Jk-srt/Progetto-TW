FROM node:20-alpine AS development

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --legacy-peer-deps

RUN chown -R nodejs:nodejs /app
USER nodejs

COPY --chown=nodejs:nodejs ./src ./src

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]
