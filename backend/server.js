const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Connecter Redis adapter
const setupRedisAdapter = async () => {
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis pub error:', err));
    subClient.on('error', (err) => console.error('Redis sub error:', err));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis adapter connecté');
  } catch (err) {
    console.error('❌ Redis adapter erreur:', err.message);
    console.log('⚠️ Socket.IO fonctionne sans Redis (mode single instance)');
  }
};

setupRedisAdapter();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));

// Socket.IO — messagerie en temps réel
const connectedUsers = new Map(); // userId => socketId

io.on('connection', (socket) => {
  console.log('Socket connecté:', socket.id);

  socket.on('user:join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    console.log(`User ${userId} enregistré`);
  });

  socket.on('message:send', async ({ to, from, content, conversationId }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(`user:${to}`).emit('message:receive', {
        from, content, conversationId, createdAt: new Date(),
      });
    }
    io.to(`user:${from}`).emit('message:sent', {
      to, content, conversationId, createdAt: new Date(),
    });
  });

  socket.on('typing:start', ({ to, from, username }) => {
    io.to(`user:${to}`).emit('typing:update', { from, username, isTyping: true });
  });

  socket.on('typing:stop', ({ to, from }) => {
    io.to(`user:${to}`).emit('typing:update', { from, isTyping: false });
  });

  socket.on('disconnect', () => {
    for (const [userId, sid] of connectedUsers.entries()) {
      if (sid === socket.id) { connectedUsers.delete(userId); break; }
    }
  });
});

// Rendre io accessible aux routes
app.set('io', io);

// Health check pour Kubernetes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/snapgram')
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
