require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

require("./db");

const authRoutes = require("./routes/auth");
const weatherRoutes = require("./routes/weather");
const favoritesRoutes = require("./routes/favorites");
const authMiddleware = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT;

app.use(cookieParser());
app.use(express.json());
app.use(
  express.static(path.join(__dirname, "..", "frontend"), { index: false }),
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/weather", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/favorites", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "favorites.html"));
});

app.use("/api", authRoutes);
app.use("/api", weatherRoutes);
app.use("/api", authMiddleware, favoritesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
