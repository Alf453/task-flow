require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectDB } = require("./models/db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());

// Connect to MongoDB then start server
connectDB()
  .then(() => {
    // Routes
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/projects", require("./routes/projects"));
    app.use("/api/projects/:projectId/tasks", require("./routes/tasks"));
    app.use("/api/dashboard", require("./routes/dashboard"));

    // Health check
    app.get("/api/health", (_, res) =>
      res.json({
        status: "ok",
        db: "mongodb",
        timestamp: new Date().toISOString(),
      }),
    );

    // Serve frontend in production
    if (process.env.NODE_ENV === "production") {
      const frontendPath = path.join(__dirname, "../frontend/dist");
      app.use(express.static(frontendPath));
      app.get("*", (_, res) =>
        res.sendFile(path.join(frontendPath, "index.html")),
      );
    }

    app.listen(PORT, () => console.log(`🚀 TaskFlow running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
