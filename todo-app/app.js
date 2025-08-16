"use strict";

const express = require("express");
const app = express();
const { Todo } = require("./models");
const methodOverride = require("method-override");
const csurf = require("csurf");
const cookieParser = require("cookie-parser");

// Middleware
app.use(methodOverride("_method"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// CSRF protection (skip for test environment to simplify testing)
if (process.env.NODE_ENV !== "test") {
  app.use(csurf({ cookie: true }));
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
}

// Set view engine
app.set("view engine", "ejs");

// Helper to detect JSON requests
function wantsJSON(req) {
  return req.headers["accept"] && req.headers["accept"].includes("application/json");
}

// Home route
app.get("/", async (req, res) => {
  try {
    const overdue = await Todo.overdue();
    const dueToday = await Todo.dueToday();
    const dueLater = await Todo.dueLater();
    const completedTodos = await Todo.completedItems();

    if (wantsJSON(req)) {
      return res.json({ overdue, dueToday, dueLater, completedTodos });
    } else {
      return res.render("index", { overdue, dueToday, dueLater, completedTodos });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new todo
app.post("/todos", async (req, res) => {
  try {
    const { title, dueDate } = req.body;
    if (!title || !dueDate) return res.status(400).json({ error: "Title & dueDate required" });

    const todo = await Todo.create({ title, dueDate, completed: false });

    if (wantsJSON(req)) return res.status(200).json(todo);
    else return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.status(422).json(error);
  }
});

// Toggle todo completion
app.put("/todos/:id/complete", async (req, res) => {
  try {
    const todoId = parseInt(req.params.id, 10);
    if (isNaN(todoId)) return res.status(400).json({ error: "Invalid ID" });

    const todo = await Todo.findByPk(todoId);
    if (!todo) return res.status(404).json({ error: "Todo not found" });

    todo.completed = !todo.completed;
    await todo.save();

    if (wantsJSON(req)) return res.json(todo);
    else return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a todo
app.delete("/todos/:id", async (req, res) => {
  try {
    const todoId = parseInt(req.params.id, 10);
    if (isNaN(todoId)) return res.status(400).json(false);

    const deleted = await Todo.destroy({ where: { id: todoId } });

    if (wantsJSON(req)) return deleted ? res.status(200).json(true) : res.status(404).json(false);
    else return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.status(500).json(false);
  }
});

module.exports = app;
