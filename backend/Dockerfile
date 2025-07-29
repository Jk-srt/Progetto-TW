FROM node:20-alpine AS development

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Adjust ownership for non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Copy entire project into image (app.js, routes/, src/, .env, etc.)
COPY --chown=nodejs:nodejs . .

# Expose port
EXPOSE 3000

# Use dumb-init then start in development mode (with nodemon if configured)
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]
