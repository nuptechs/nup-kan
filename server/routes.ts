import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema, insertColumnSchema, insertTeamMemberSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const taskData = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, taskData);
      res.json(task);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Column routes
  app.get("/api/columns", async (req, res) => {
    try {
      const columns = await storage.getColumns();
      res.json(columns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });

  app.patch("/api/columns/:id", async (req, res) => {
    try {
      const column = await storage.updateColumn(req.params.id, req.body);
      res.json(column);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  // Team member routes
  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ message: "Invalid team member data" });
    }
  });

  app.patch("/api/team-members/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const member = await storage.updateTeamMemberStatus(req.params.id, status);
      res.json(member);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.status(400).json({ message: "Invalid status data" });
    }
  });

  // Analytics endpoint
  app.get("/api/analytics", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const columns = await storage.getColumns();
      
      // Calculate basic metrics
      const doneTasks = tasks.filter(task => task.status === "done");
      const inProgressTasks = tasks.filter(task => task.status === "inprogress");
      const totalTasks = tasks.length;
      
      // Calculate average cycle time (mock calculation)
      const averageCycleTime = doneTasks.length > 0 ? 
        Math.round((Math.random() * 5 + 1) * 10) / 10 : 0;
      
      // Calculate throughput (tasks completed this week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const throughput = doneTasks.filter(task => 
        task.updatedAt && new Date(task.updatedAt) >= oneWeekAgo
      ).length;
      
      // Calculate efficiency
      const efficiency = totalTasks > 0 ? 
        Math.round((doneTasks.length / totalTasks) * 100) : 0;
      
      // Count blockers (tasks that haven't moved in a while or high priority in progress)
      const blockers = inProgressTasks.filter(task => 
        task.priority === "high" && task.progress < 50
      ).length;
      
      res.json({
        averageCycleTime,
        throughput,
        efficiency,
        blockers,
        totalTasks,
        doneTasks: doneTasks.length,
        inProgressTasks: inProgressTasks.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
