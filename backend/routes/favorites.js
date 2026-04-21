const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/favorites", (req, res) => {
  const { city } = req.body;
  const userId = req.user.id;

  if (!city || typeof city !== "string" || city.trim().length < 2) {
    return res.status(400).json({ error: "City is required and must be at least 2 characters" });
  }

  const normalizedCity = city.trim();

  db.get(
    "SELECT id FROM favorites WHERE userId = ? AND city = ? COLLATE NOCASE",
    [userId, normalizedCity],
    (findErr, existingFavorite) => {
      if (findErr) {
        return res.status(500).json({ error: "Failed to save favorite" });
      }

      if (existingFavorite) {
        return res.status(409).json({ error: "City is already in favorites" });
      }

      db.run(
        "INSERT INTO favorites (userId, city) VALUES (?, ?)",
        [userId, normalizedCity],
        function onInsert(err) {
          if (err) {
            if (err.message.includes("UNIQUE")) {
              return res.status(409).json({ error: "City is already in favorites" });
            }

            return res.status(500).json({ error: "Failed to save favorite" });
          }

          return res.status(201).json({
            id: this.lastID,
            userId,
            city: normalizedCity,
          });
        },
      );
    },
  );
});

router.get("/favorites", (req, res) => {
  const userId = req.user.id;

  db.all(
    "SELECT id, userId, city FROM favorites WHERE userId = ? ORDER BY id DESC",
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to load favorites" });
      }

      return res.json(rows);
    },
  );
});

router.delete("/favorites/:id", (req, res) => {
  const userId = req.user.id;
  const favoriteId = Number(req.params.id);

  if (!Number.isInteger(favoriteId) || favoriteId <= 0) {
    return res.status(400).json({ error: "Invalid favorite id" });
  }

  db.run(
    "DELETE FROM favorites WHERE id = ? AND userId = ?",
    [favoriteId, userId],
    function onDelete(err) {
      if (err) {
        return res.status(500).json({ error: "Failed to delete favorite" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Favorite not found" });
      }

      return res.json({ message: "Favorite deleted" });
    },
  );
});

module.exports = router;