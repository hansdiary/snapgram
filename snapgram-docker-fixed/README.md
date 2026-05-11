# 📸 Snapgram — Mini réseau social type Instagram

Stack : **React** + **Node.js/Express** + **MongoDB** + **Socket.IO**  
Conteneurisation : **Docker** + **Docker Compose**

---

## 🗂️ Structure

```
snapgram/
├── docker-compose.yml        ← Production (3 services)
├── docker-compose.dev.yml    ← Dev avec hot reload
├── .env.example
├── backend/
│   ├── Dockerfile            ← node:20-alpine
│   ├── Dockerfile.dev        ← nodemon
│   ├── server.js, models/, routes/, middleware/, config/
└── frontend/
    ├── Dockerfile            ← Multi-stage: React build → Nginx
    ├── Dockerfile.dev        ← react-scripts
    ├── nginx.conf            ← SPA + proxy /api + /socket.io
    └── src/
```

---

## 🐳 Démarrage rapide

### Production

```bash
cp .env.example .env          # éditer JWT_SECRET
docker compose up --build -d  # → http://localhost
```

| Service    | Image              | Port public |
|---|---|---|
| mongo      | mongo:7            | —           |
| backend    | node:20-alpine     | —           |
| frontend   | nginx:1.25-alpine  | **:80**     |

Nginx proxifie `/api/*` et `/socket.io/*` → backend. Zéro CORS.

### Développement (hot reload)

```bash
docker compose -f docker-compose.dev.yml up --build
# Frontend → localhost:3000
# Backend  → localhost:5000
# MongoDB  → localhost:27017
```

---

## 🔧 Commandes utiles

```bash
docker compose logs -f              # tous les logs
docker compose logs -f backend      # logs backend seulement
docker compose down                 # arrêter
docker compose down -v              # arrêter + reset DB
docker compose exec backend sh      # shell backend
docker compose exec mongo mongosh snapgram
```
