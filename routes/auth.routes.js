import express from "express";
import {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  changePassword,
  deleteAccount,
} from "../controllers/auth.controller.js";
import protectRoute from "../middlewares/protectedRoute.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", register);
router.post("/logout", protectRoute, logout);
router.get("/me", protectRoute, getMe);
router.patch("/profile", protectRoute, updateProfile);
router.patch("/password", protectRoute, changePassword);
router.post("/account", protectRoute, deleteAccount);

export default router;
