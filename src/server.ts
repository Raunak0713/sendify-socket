import express from "express"; // ✅ Import Request & Response
import { createServer } from "http";
import { Request, Response } from "express";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

type NotificationPayload = {
  content: string;
  notificationId: string;
  buttonText?: string;
  buttonUrl?: string;
};

const app = express();
const server = createServer(app);
app.use(express.json());
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  },
});

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

app.post("/send-notification", (req: any, res: any) => {
  // ✅ Properly typed request body
  const { notificationId, userIds, content, buttonText, buttonUrl } = req.body as {
    notificationId: string;
    userIds: string[];
    content: string;
    buttonText?: string;
    buttonUrl?: string;
  };

  if (!notificationId) {
    return res.status(400).json({ error: "notificationId is required" });
  }

  console.log(`📢 Sending notification with ID: ${notificationId} to ${userIds.length} users`);

  userIds.forEach((userId) => {
    const socketId = userSockets.get(userId);
    if (socketId) {
      io.to(socketId).emit("new-notification", {
        notificationId,
        content,
        buttonText,
        buttonUrl,
      });
      console.log(`📢 Sent notification to User: ${userId} with ID: ${notificationId}`);
    }
  });

  res.status(200).json({ message: "Notifications sent", notificationId });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Socket server running on port ${PORT}`);
});
