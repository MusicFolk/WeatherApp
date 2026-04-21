const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const isApiRequest = req.originalUrl.startsWith("/api");
  const token = req.cookies?.authToken;

  if (!token) {
    if (isApiRequest) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    return next();
  } catch (error) {
    if (isApiRequest) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    res.clearCookie("authToken", { path: "/" });
    return res.redirect("/login");
  }
}

module.exports = authMiddleware;
