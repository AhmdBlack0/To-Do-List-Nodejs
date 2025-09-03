import express from "express";
import protectedRoute from "../middlewares/protectedRoute.js";
import {
  createTodo,
  getTodos,
  getTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
} from "../controllers/todo.controller.js";
const router = express.Router();

router.use(protectedRoute);

router.get("/", getTodos);
router.post("/", createTodo);
router.get("/:id", getTodo);
router.patch("/:id", updateTodo);
router.patch("/:id/toggle", toggleTodo);
router.delete("/:id", deleteTodo);

export default router;
