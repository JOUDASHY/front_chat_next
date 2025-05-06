# Utiliser une image de base officielle Node.js
FROM node:18-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer toutes les dépendances (y compris dev pour le build)
RUN npm ci

# Copier le reste de l'application
COPY . .

# Construire l'application Next.js
RUN npm run build

# Pour la production, on peut maintenant installer uniquement les dépendances de production
RUN npm ci --only=production

# Exposer le port sur lequel l'application va tourner
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["npm", "start"]
