import Todo from "../models/todo.model.js";
export const createTodo = async (req, res) => {
  const { title, description, priority, dueDate } = req.body;
  const todo = new Todo({
    title,
    description,
    priority,
    dueDate,
    user: req.userId,
  });
  todo
    .save()
    .then((todo) => {
      res.status(201).json({
        message: "Todo created successfully",
        data: todo,
      });
    })
    .catch((error) => {
      res.status(500).json({ error: "Error creating todo" });
    });
};

export const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find({ user: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({ data: todos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findOne({ _id: id, user: req.userId });
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    res.status(200).json({ data: todo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const todo = await Todo.findOneAndUpdate(
      { _id: id, user: req.userId },
      updates,
      { new: true }
    );
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    res.status(200).json({ data: todo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findOneAndDelete({ _id: id, user: req.userId });
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    res.status(200).json({ message: "Todo deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findOne({ _id: id, user: req.userId });
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    todo.completed = !todo.completed;
    await todo.save();
    res.status(200).json({ data: todo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
