FROM node:20-alpine AS base
WORKDIR /app

# Development stage
FROM base AS development
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage (runs securely as non-root user)
FROM base AS production
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
