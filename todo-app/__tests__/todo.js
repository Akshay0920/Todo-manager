/* eslint-disable no-undef */
const request = require("supertest");
const db = require("../models");
const app = require("../app");
const cheerio = require("cheerio");

let server, agent;

function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

describe("List the todo items", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  test("create a new todo", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);

    const response = await agent
      .post("/todos")
      .type("form") // <-- important
      .send({
        title: "Buy milk",
        dueDate: new Date().toISOString().split("T")[0],
        completed: false,
        _csrf: csrfToken,
      });

    expect(response.statusCode).toBe(302);
  });

  test("Mark a todo as complete", async () => {
    // Create a todo first
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent
      .post("/todos")
      .type("form")
      .send({
        title: "Complete me",
        dueDate: new Date().toISOString().split("T")[0],
        completed: false,
        _csrf: csrfToken,
      });

    // Get JSON response to find the latest todo
    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday?.length || 0;
    expect(dueTodayCount).toBeGreaterThan(0);

    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    // Toggle completion
    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    await agent
      .put(`/todos/${latestTodo.id}/complete`)
      .type("form")
      .send({ _csrf: csrfToken });

    // Fetch JSON again to verify in completed section
    const updatedResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const updatedTodos = JSON.parse(updatedResponse.text);
    const completedTodo = updatedTodos.completedTodos.find(
      (t) => t.id === latestTodo.id
    );

    expect(completedTodo.completed).toBe(true);
  });

  test("Delete a todo", async () => {
    // Create a todo to delete
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);

    await agent
      .post("/todos")
      .type("form")
      .send({
        title: "Delete me",
        dueDate: new Date().toISOString().split("T")[0],
        completed: false,
        _csrf: csrfToken,
      });

    const todosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const todos = JSON.parse(todosResponse.text).dueToday;
    const todoToDelete = todos.find((t) => t.title === "Delete me");

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const deleteResponse = await agent
      .delete(`/todos/${todoToDelete.id}`)
      .type("form")
      .send({ _csrf: csrfToken });

    expect(deleteResponse.statusCode).toBe(302);
  });
});
