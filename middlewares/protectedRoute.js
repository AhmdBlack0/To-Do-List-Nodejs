import jwt from "jsonwebtoken";

const protectRoute = (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.userId = decoded.userId;

    next();
  } catch (error) {
    res.status(401).json({ error: "Not authorized, invalid token" });
  }
};

export default protectRoute;
