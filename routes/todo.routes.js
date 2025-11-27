import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  createTodo,
  getTodos,
  getTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
} from "../controllers/todo.controller.js";
const router = express.Router();

router.use(verifyToken);

router.get("/", getTodos);
router.post("/", createTodo);
router.get("/:id", getTodo);
router.patch("/:id", updateTodo);
router.patch("/:id/toggle", toggleTodo);
router.delete("/:id", deleteTodo);

export default router;
