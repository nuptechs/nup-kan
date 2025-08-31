import type { Request, Response } from "express";
import { taskService, assigneeService } from "../services";
import { AuthRequest } from "../auth/unifiedAuth";
import { insertTaskAssigneeSchema } from "@shared/schema";
import { createAuthContextFromRequest } from "../utils/authUtils";
import { Logger } from '../utils/logMessages';

export class TaskController {
  static async getTasks(req: AuthRequest, res: Response) {
    try {
      // Paginação opcional
      const page = parseInt(req.query.page as string);
      const limit = parseInt(req.query.limit as string);
      const authContext = createAuthContextFromRequest(req);
      
      if (page && limit) {
        const validPage = Math.max(1, page);
        const validLimit = Math.min(100, Math.max(1, limit));
        const offset = (validPage - 1) * validLimit;
        
        // Buscar todas as tasks com paginação
        const tasks = await taskService.getAllTasks(authContext, {
          page: validPage,
          limit: validLimit
        });
        
        res.json({
          data: tasks,
          pagination: {
            page: validPage,
            limit: validLimit,
            offset
          }
        });
      } else {
        // Buscar todas as tasks sem paginação
        const tasks = await taskService.getAllTasks(authContext);
        res.json(tasks);
      }
    } catch (error) {
      Logger.error.generic('FETCH-TASKS', error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  }

  static async getTask(req: AuthRequest, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const task = await taskService.getTask(authContext, req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      Logger.error.generic('FETCH-TASK', error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  }

  static async createTask(req: AuthRequest, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const task = await taskService.createTask(authContext, req.body);
      
      res.status(201).json(task);
    } catch (error) {
      Logger.error.generic('CREATE-TASK', error);
      res.status(400).json({ message: "Invalid task data" });
    }
  }

  static async updateTask(req: AuthRequest, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const updatedTask = await taskService.updateTask(authContext, req.params.id, req.body);
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(400).json({ message: "Invalid task data" });
    }
  }

  static async deleteTask(req: AuthRequest, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      await taskService.deleteTask(authContext, req.params.id);
      
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(500).json({ message: "Failed to delete task" });
    }
  }

  static async reorderTasks(req: AuthRequest, res: Response) {
    Logger.service.operation('task-controller', 'reorder', 'Request received');
    Logger.service.operation('task-controller', 'reorder', `Method: ${req.method}`);
    
    try {
      const authContext = createAuthContextFromRequest(req);
      const result = await taskService.reorderTasks(authContext, req.body);
      
      res.json(result);
    } catch (error) {
      Logger.error.generic('TASK-REORDER', error);
      res.status(400).json({ message: "Failed to reorder tasks" });
    }
  }

  static async getBoardTasks(req: AuthRequest, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const tasks = await taskService.getBoardTasks(authContext, req.params.boardId);
      res.json(tasks);
    } catch (error) {
      Logger.error.generic('BOARD-TASKS-FETCH', error);
      res.status(500).json({ message: "Failed to fetch board tasks" });
    }
  }

  // Assignee methods
  static async getTaskAssignees(req: AuthRequest, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const assignees = await assigneeService.getTaskAssignees(authContext, req.params.taskId);
      res.json(assignees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task assignees" });
    }
  }

  static async addTaskAssignee(req: AuthRequest, res: Response) {
    try {
      const assigneeData = insertTaskAssigneeSchema.parse({
        taskId: req.params.taskId,
        userId: req.body.userId,
      });
      const authContext = createAuthContextFromRequest(req);
      const assignee = await taskService.addTaskAssignee(authContext, req.params.taskId, req.body.userId);
      res.status(201).json(assignee);
    } catch (error) {
      res.status(400).json({ message: "Invalid assignee data" });
    }
  }

  static async removeTaskAssignee(req: AuthRequest, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      await taskService.removeTaskAssignee(authContext, req.params.taskId, req.params.userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Assignee not found" });
      }
      res.status(500).json({ message: "Failed to remove assignee" });
    }
  }

  static async setTaskAssignees(req: AuthRequest, res: Response) {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ message: "userIds must be an array" });
      }
      const authContext = createAuthContextFromRequest(req);
      await taskService.setTaskAssignees(authContext, req.params.taskId, userIds);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to set task assignees" });
    }
  }

  static async bulkGetAssignees(req: AuthRequest, res: Response) {
    try {
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "taskIds must be a non-empty array" });
      }

      // Buscar assignees para todas as tasks em paralelo
      const authContext = createAuthContextFromRequest(req);
      const assigneesPromises = taskIds.map(async (taskId: string) => {
        try {
          const assignees = await taskService.getTaskAssignees(authContext, taskId);
          return { taskId, assignees };
        } catch (error) {
          Logger.error.generic(`TASK-ASSIGNEES-${taskId}`, error);
          return { taskId, assignees: [] };
        }
      });

      const results = await Promise.all(assigneesPromises);
      
      // Converter array para objeto com taskId como chave
      const assigneesByTask = results.reduce((acc, { taskId, assignees }) => {
        acc[taskId] = assignees;
        return acc;
      }, {} as Record<string, any[]>);

      res.json(assigneesByTask);
    } catch (error) {
      Logger.error.generic('BULK-ASSIGNEES-FETCH', error);
      res.status(500).json({ error: "Failed to fetch assignees" });
    }
  }

  // Custom values methods
  static async getTaskCustomValues(req: AuthRequest, res: Response) {
    try {
      // Custom values are not implemented in TaskService yet
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task custom values" });
    }
  }

  static async createTaskCustomValue(req: AuthRequest, res: Response) {
    try {
      // Custom values are not implemented in TaskService yet
      const customValue = { ...req.body, taskId: req.params.taskId, id: Date.now().toString() };
      res.status(201).json(customValue);
    } catch (error) {
      res.status(400).json({ message: "Failed to create task custom value" });
    }
  }

  static async updateTaskCustomValue(req: AuthRequest, res: Response) {
    try {
      // Custom values are not implemented in TaskService yet
      const updatedValue = { ...req.body, id: req.params.valueId, taskId: req.params.taskId };
      res.json(updatedValue);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Custom value not found" });
      }
      res.status(400).json({ message: "Failed to update task custom value" });
    }
  }
}