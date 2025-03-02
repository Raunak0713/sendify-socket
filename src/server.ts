import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

type NotificationPayload = {
  userId: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // Allow specific frontend URL in production
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const userSockets = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`[+] New client connected: ${socket.id}`);

  socket.on("register", (userId: string) => {
    userSockets.set(userId, socket.id);
    console.log(`🔹 User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    let disconnectedUser = "";
    userSockets.forEach((value, key) => {
      if (value === socket.id) {
        userSockets.delete(key);
        disconnectedUser = key;
      }
    });
    console.log(`[-] Client disconnected: ${socket.id} (User: ${disconnectedUser})`);
  });
});

app.post("/send-notification", (req, res) => {
  const { userIds, content, buttonText, buttonUrl }: { userIds: string[] } & NotificationPayload = req.body;

  userIds.forEach((userId) => {
    const socketId = userSockets.get(userId);
    if (socketId) {
      io.to(socketId).emit("new-notification", { content, buttonText, buttonUrl });
      console.log(`📢 Sent notification to User: ${userId}`);
    }
  });

  res.status(200).json({ message: "Notifications sent" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Socket server running on port ${PORT}`);
});
