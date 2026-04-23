const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  };
}

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email.toLowerCase(), hashedPassword],
      function onInsert(err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res.status(409).json({ error: "Email already registered" });
          }
          return res.status(500).json({ error: "Failed to register user" });
        }

        return res.status(201).json({
          message: "User registered successfully",
          user: { id: this.lastID, email: email.toLowerCase() },
        });
      },
    );
  } catch (error) {
    return res.status(500).json({ error: "Server error while registering" });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db.get(
    "SELECT id, email, password FROM users WHERE email = ?",
    [email.toLowerCase()],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Failed to login" });
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      try {
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "1d" },
        );

        res.cookie("authToken", token, getAuthCookieOptions());
        return res.json({ message: "Login successful" });
      } catch (error) {
        return res.status(500).json({ error: "Server error while logging in" });
      }
    },
  );
});

router.post("/logout", (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res.json({ message: "Logout successful" });
});

router.get("/auth-status", (req, res) => {
  const token = req.cookies?.authToken;

  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ authenticated: true });
  } catch (error) {
    res.clearCookie("authToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res.json({ authenticated: false });
  }
});

module.exports = router;
