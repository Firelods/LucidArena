# --- Etape 1 : Build de l'app ---
FROM node:22-alpine AS builder

# Définit le répertoire de travail
WORKDIR /app

# Copie les fichiers nécessaires pour l'installation des dépendances
COPY package*.json ./

# Installe les dépendances
RUN npm install

# Copie le reste des fichiers de l'application
COPY . .

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build de l'application React
RUN npm run build

# --- Etape 2 : Serve l'app avec Nginx ---
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie le fichier de configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
