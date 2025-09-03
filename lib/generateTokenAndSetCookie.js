import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
  });

  res.cookie("jwt", token, {
    maxAge: 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: false,
  });
};
