const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const postRoutes = require("./routes/postRoutes");
const commentRoutes = require("./routes/commentRoutes");
const voteRoutes = require("./routes/voteRoutes");
const authRoutes = require("./routes/authRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const notificationService = require("./services/notificationService");

const isLocalOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return ["127.0.0.1", "localhost"].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const allowedOrigins = (process.env.CLIENT_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes("*") ||
      allowedOrigins.includes(origin) ||
      isLocalOrigin(origin)
    ) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS origin not allowed"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

const feedNamespace = io.of("/feed");
const commentNamespace = io.of("/comments");
const notificationNamespace = io.of("/notifications");

feedNamespace.on("connection", (socket) => {
  socket.on("disconnect", () => {});
});

commentNamespace.on("connection", (socket) => {
  socket.on("join", (room) => socket.join(room));
});

notificationNamespace.on("connection", (socket) => {
  socket.on("join", (room) => socket.join(room));
});

notificationService.setNamespaces({
  feedNamespace,
  commentNamespace,
  notificationNamespace,
});

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

const communityRoutes = require("./routes/communityRoutes");
const communityMessageRoutes = require("./routes/communityMessageRoutes");
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/votes", voteRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/communities", communityRoutes);
app.use("/api/v1/community-messages", communityMessageRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      status: 404,
    },
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  console.error(error);

  res.status(status).json({
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: error.message || "Something went wrong",
      status,
    },
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
