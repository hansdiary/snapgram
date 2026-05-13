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

// =========================
// CORS ORIGINS
// =========================
const allowedOrigins = [
   "http://34.71.223.194",
  'http://34.36.179.232', // ingress ip
];

// =========================
// EXPRESS CORS
// =========================
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// =========================
// MIDDLEWARES
// =========================
app.use(express.json());

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// =========================
// SOCKET.IO
// =========================
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: [
      "http://34.71.223.194",
      "http://34.36.179.232"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  // transports: ["websocket"],
  // allowEIO3: true,
});

// =========================
// REDIS ADAPTER
// =========================
const setupRedisAdapter = async () => {
  try {
    const pubClient = createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379',
    });

    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      console.error('Redis pub error:', err);
    });

    subClient.on('error', (err) => {
      console.error('Redis sub error:', err);
    });

    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
    ]);

    io.adapter(createAdapter(pubClient, subClient));

    console.log('✅ Redis adapter connecté');
  } catch (err) {
    console.error('❌ Redis adapter erreur:', err.message);

    console.log(
      '⚠️ Socket.IO fonctionne sans Redis'
    );
  }
};

setupRedisAdapter();

// =========================
// ROUTES
// =========================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));

// =========================
// SOCKET EVENTS
// =========================
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('✅ Socket connecté:', socket.id);

  socket.on('user:join', (userId) => {
    connectedUsers.set(userId, socket.id);

    socket.join(`user:${userId}`);

    console.log(`User ${userId} enregistré`);
  });

  socket.on(
    'message:send',
    async ({ to, from, content, conversationId }) => {
      io.to(`user:${to}`).emit(
        'message:receive',
        {
          from,
          content,
          conversationId,
          createdAt: new Date(),
        }
      );

      io.to(`user:${from}`).emit(
        'message:sent',
        {
          to,
          content,
          conversationId,
          createdAt: new Date(),
        }
      );
    }
  );

  socket.on(
    'typing:start',
    ({ to, from, username }) => {
      io.to(`user:${to}`).emit(
        'typing:update',
        {
          from,
          username,
          isTyping: true,
        }
      );
    }
  );

  socket.on(
    'typing:stop',
    ({ to, from }) => {
      io.to(`user:${to}`).emit(
        'typing:update',
        {
          from,
          isTyping: false,
        }
      );
    }
  );

  socket.on('disconnect', () => {
    console.log('❌ Socket déconnecté:', socket.id);

    for (const [userId, sid] of connectedUsers.entries()) {
      if (sid === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

// =========================
// ACCESS IO IN ROUTES
// =========================
app.set('io', io);

// =========================
// HEALTH CHECK
// =========================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
  });
});

// =========================
// MONGODB
// =========================
mongoose
  .connect(
    process.env.MONGO_URI ||
      'mongodb://localhost:27017/snapgram'
  )
  .then(() => {
    console.log('✅ MongoDB connecté');
  })
  .catch((err) => {
    console.error('❌ MongoDB erreur:', err);
  });

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur ${PORT}`);
});