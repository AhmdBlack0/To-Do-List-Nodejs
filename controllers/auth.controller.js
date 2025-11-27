import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../lib/generateTokenAndSetCookie.js";
import nodemailer from "nodemailer";
import { createHash, randomInt } from "crypto";
import dotenv from "dotenv";
import { asyncHandler } from "../middlewares/asyncHandler.js";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

const generateVerificationCode = () => randomInt(100000, 1000000).toString();

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  let user = await User.findOne({ email });
  if (user) {
    const err = new Error("User already exists");
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const verificationCode = generateVerificationCode();
  const verificationCodeExpires = Date.now() + 600000;

  user = await User.create({
    name,
    email,
    password: hashedPassword,
    verificationCode,
    verificationCodeExpires,
    isVerified: false,
  });

  await transporter.sendMail({
    from: `"My App" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your email",
    html: `
      <h2>Hello ${user.name}</h2>
      <p>Your verification code:</p>
      <h1 style="color:#007bff">${verificationCode}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  });

  res.cookie("verifyEmail", user.email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 10 * 60 * 1000,
  });

  res.status(201).json({
    success: true,
    message: "Verification code sent to your email.",
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const email = req.cookies.verifyEmail;

  if (!email) {
    const err = new Error("Verification expired. Register again.");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({
    email,
    verificationCode: code,
    verificationCodeExpires: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error("Invalid or expired verification code");
    err.statusCode = 400;
    throw err;
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();

  res.clearCookie("verifyEmail");

  generateTokenAndSetCookie(user, res);

  res.json({ success: true, message: "Email verified successfully!" });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const email = req.cookies.verifyEmail;

  if (!email) {
    const err = new Error("Verification session expired. Register again.");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (user.isVerified) {
    const err = new Error("Email already verified");
    err.statusCode = 400;
    throw err;
  }

  const verificationCode = generateVerificationCode();

  user.verificationCode = verificationCode;
  user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await transporter.sendMail({
    from: `"My App" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Resend verification code",
    html: `
      <h2>Hello ${user.name}</h2>
      <p>Your new code:</p>
      <h1 style="color:#007bff">${verificationCode}</h1>
    `,
  });

  res.cookie("verifyEmail", email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 10 * 60 * 1000,
  });

  res.json({ success: true, message: "Verification code resent" });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password +isVerified");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const err = new Error("Invalid credentials");
    err.statusCode = 400;
    throw err;
  }

  if (!user.isVerified) {
    const err = new Error("Please verify your email first");
    err.statusCode = 401;
    throw err;
  }

  generateTokenAndSetCookie(user, res);

  res.json({ success: true, message: "Logged in successfully" });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select(
    "-password -__v -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires"
  );

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const user = await User.findByIdAndUpdate(
    req.userId,
    { name },
    { new: true }
  ).select("-password -__v");

  res.json({ success: true, message: "Profile updated", user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select("+password");

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    const err = new Error("Current password incorrect");
    err.statusCode = 400;
    throw err;
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ success: true, message: "Password changed successfully" });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.userId).select("+password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (!(await bcrypt.compare(password, user.password))) {
    const err = new Error("Password is incorrect");
    err.statusCode = 400;
    throw err;
  }

  await user.deleteOne();

  res.clearCookie("jwt");

  res.json({ success: true, message: "Account deleted" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    const err = new Error("Email is required");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // Generate 6-digit code
  const resetCode = randomInt(100000, 1000000).toString();

  const hashedCode = createHash("sha256").update(resetCode).digest("hex");

  user.resetPasswordCode = hashedCode;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 min
  await user.save();

  // Set cookie storing the email
  res.cookie("resetEmail", email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 10 * 60 * 1000,
  });

  await transporter.sendMail({
    from: `"My App" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Reset Password",
    html: `<h2>Password Reset Code</h2><h1>${resetCode}</h1>`,
  });

  res.json({
    success: true,
    message: "Reset code sent to email",
  });
});

export const resetForgetPassword = asyncHandler(async (req, res) => {
  const email = req.cookies.resetEmail;
  const { code, newPassword } = req.body;

  if (!email) {
    const err = new Error("Email cookie missing");
    err.statusCode = 400;
    throw err;
  }

  if (!code || !newPassword) {
    const err = new Error("Code and new password are required");
    err.statusCode = 400;
    throw err;
  }

  // Trim whitespace from code
  const cleanedCode = code.toString().trim();

  const hashedCode = createHash("sha256").update(cleanedCode).digest("hex");

  const user = await User.findOne({
    email,
    resetPasswordCode: hashedCode,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error("Invalid or expired code");
    err.statusCode = 400;
    throw err;
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  // Clear cookie
  res.clearCookie("resetEmail");

  res.json({
    success: true,
    message: "Password reset successfully. You can now log in.",
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.json({ success: true, message: "Logged out successfully" });
});
