"use strict";
const { Model, Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    static associate() {}

    static addTodo(title, dueDate) {
      return this.create({ title, dueDate, completed: false });
    }

    static async getTodos() {
      return this.findAll({ order: [["id", "ASC"]] });
    }

    // NEW: set completion to true/false
    static async setCompletionStatus(id, completed) {
      const todo = await this.findByPk(id);
      if (!todo) return null;
      todo.completed = completed;
      await todo.save();
      return todo;
    }

    static async remove(id) {
      return this.destroy({ where: { id } });
    }

    static async overdue() {
      return this.findAll({
        where: { dueDate: { [Op.lt]: new Date().toISOString().split("T")[0] } },
        order: [["id", "ASC"]],
      });
    }

    static async dueToday() {
      return this.findAll({
        where: { dueDate: new Date().toISOString().split("T")[0] },
        order: [["id", "ASC"]],
      });
    }

    static async dueLater() {
      return this.findAll({
        where: { dueDate: { [Op.gt]: new Date().toISOString().split("T")[0] } },
        order: [["id", "ASC"]],
      });
    }

    // NEW: fetch all completed todos
    static async completedItems() {
      return this.findAll({
        where: { completed: true },
        order: [["id", "ASC"]],
      });
    }
  }

  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: { type: DataTypes.BOOLEAN, defaultValue: false },

    },
    { sequelize, modelName: "Todo" }
  );

  return Todo;
};
