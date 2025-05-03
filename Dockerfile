# 1) Build
FROM node:18-alpine AS builder
WORKDIR /app

# Désactiver la télémétrie Next
ENV NEXT_TELEMETRY_DISABLED=1

# Copier les seuls fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (incluant devDependencies pour TS)
RUN npm ci

# Copier l'ensemble du code source (y compris le fichier .env.local)
COPY . .

# Build Next.js (génère .next)
RUN npm run build

# 2) Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copier uniquement le nécessaire depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.local ./.env.local  # Copier le fichier .env.local

# Exposer le port par défaut
EXPOSE 3000

# Lancer Next.js en production
CMD ["npm", "run", "start"]
