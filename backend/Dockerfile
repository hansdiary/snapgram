FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads/posts uploads/avatars

EXPOSE 5000

CMD ["node", "server.js"]
