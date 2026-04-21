require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const express = require("express");
const cors = require("cors");

require("./db");

const authRoutes = require("./routes/auth");
const weatherRoutes = require("./routes/weather");
const favoritesRoutes = require("./routes/favorites");
const authMiddleware = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.use(authRoutes);
app.use(weatherRoutes);
app.use(authMiddleware, favoritesRoutes);

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