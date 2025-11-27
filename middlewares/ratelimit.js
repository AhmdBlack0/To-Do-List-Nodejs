import rateLimit from "express-rate-limit";

export const ratelimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 4,
  message: {
    success: false,
    message: "Too many verification requests. Try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res, next, options) => {
    res.status(429).json({
      success: false,
      message: "Limit exceeded. Try again later.",
      retryAfter: Math.ceil(options.windowMs / 1000) + " seconds",
    });
  },

  keyGenerator: (req) => req.ip,
});
