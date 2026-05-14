const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

// =========================
// CONFIG
// =========================
const CLIENT_ORIGIN = "http://34.71.223.194";

// =========================
// EXPRESS MIDDLEWARE
// =========================
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));

app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =========================
// SOCKET.IO
// =========================
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
  transports: ["websocket"], 
});

// =========================
// REDIS ADAPTER
// =========================
const setupRedis = async () => {
  try {
    const pubClient = createClient({
      url: process.env.REDIS_URL || "redis://redis:6379",
    });

    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));

    console.log("✅ Redis adapter OK");
  } catch (err) {
    console.log("⚠️ Redis non connecté:", err.message);
  }
};

setupRedis();

// =========================
// SOCKET EVENTS
// =========================
io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  // JOIN USER ROOM
  socket.on("user:join", (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User joined room: user:${userId}`);
  });

  // MESSAGE
  socket.on("message:send", async ({ to, from, content, conversationId }) => {

    const message = {
      to,
      from,
      content,
      conversationId,
      createdAt: new Date(),
    };

    // send to receiver
    io.to(`user:${to}`).emit("message:receive", message);

    // confirm sender
    io.to(`user:${from}`).emit("message:sent", message);
  });

  // TYPING
  socket.on("typing:start", ({ to, from, username }) => {
    io.to(`user:${to}`).emit("typing:update", {
      from,
      username,
      isTyping: true,
    });
  });

  socket.on("typing:stop", ({ to, from }) => {
    io.to(`user:${to}`).emit("typing:update", {
      from,
      isTyping: false,
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

// =========================
// ROUTES
// =========================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/messages", require("./routes/messages"));

// =========================
// IO ACCESS
// =========================
app.set("io", io);

// =========================
// HEALTH CHECK
// =========================
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// =========================
// DB
// =========================
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/snapgram")
  .then(() => console.log("✅ MongoDB OK"))
  .catch(err => console.error(err));

// =========================
// START
// =========================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});