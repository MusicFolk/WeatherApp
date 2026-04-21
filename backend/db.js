const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "weather_app.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite:", err.message);
    return;
  }

  console.log("Connected to SQLite database.");
});

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`,
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      city TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
  );

  // Keep the earliest row per (userId, city) pair before applying a unique index.
  db.run(
    `DELETE FROM favorites
     WHERE id NOT IN (
       SELECT MIN(id)
       FROM favorites
       GROUP BY userId, LOWER(city)
     )`,
    (cleanupErr) => {
      if (cleanupErr) {
        console.error("Failed to clean duplicate favorites:", cleanupErr.message);
        return;
      }

      db.run(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_city
         ON favorites(userId, city COLLATE NOCASE)`,
        (indexErr) => {
          if (indexErr) {
            console.error("Failed to create favorites unique index:", indexErr.message);
          }
        },
      );
    },
  );
});

module.exports = db;