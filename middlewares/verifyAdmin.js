export const verifyAdmin = (req, res, next) => {
  if (req.userRole !== "admin" && req.userRole !== "manager") {
    return res.status(403).json({ error: "Access denied, admin only" });
  }
  next();
};
