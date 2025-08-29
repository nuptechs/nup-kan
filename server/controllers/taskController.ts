import type { Request, Response } from "express";
import { taskService, assigneeService } from "../services";
import { AuthRequest } from "../auth/simpleAuth";
import { insertTaskAssigneeSchema } from "@shared/schema";

// Helper para criar AuthContext a partir da request
function createAuthContextFromRequest(req: any): any {
  const authContextJWT = req.authContext;
  if (authContextJWT) {
    return {
      userId: authContextJWT.userId,
      userName: authContextJWT.userName,
      userEmail: authContextJWT.userEmail,
      permissions: authContextJWT.permissions,
      permissionCategories: authContextJWT.permissionCategories,
      profileId: authContextJWT.profileId || '',
      profileName: authContextJWT.profileName,
      teams: authContextJWT.teams,
      sessionId: `jwt-${authContextJWT.userId}-${Date.now()}`,
      isAuthenticated: authContextJWT.isAuthenticated,
      lastActivity: authContextJWT.lastActivity
    };
  }
  
  // Fallback para session auth
  const userId = req.session?.user?.id || req.session?.userId;
  const user = req.user;
  const permissions = req.userPermissions || [];
  
  return {
    userId: userId,
    userName: user?.name || 'Unknown',
    userEmail: user?.email || '',
    permissions: permissions.map((p: any) => p.name),
    permissionCategories: Array.from(new Set(permissions.map((p: any) => p.category))),
    profileId: user?.profileId || '',
    profileName: 'User',
    teams: [],
    sessionId: req.session?.id || 'no-session',
    isAuthenticated: !!userId,
    lastActivity: new Date()
  };
}

export class TaskController {
  static async getTasks(req: Request, res: Response) {
    try {
      // Paginação opcional
      const page = parseInt(req.query.page as string);
      const limit = parseInt(req.query.limit as string);
      
      if (page && limit) {
        const validPage = Math.max(1, page);
        const validLimit = Math.min(100, Math.max(1, limit));
        const offset = (validPage - 1) * validLimit;
        
        // Buscar tasks paginadas através do TaskService
        const authContext = createAuthContextFromRequest(req);
        const tasks = await taskService.getTasks(authContext, {
          page: validPage,
          limit: validLimit,
          offset
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
        const authContext = createAuthContextFromRequest(req);
        const tasks = await taskService.getTasks(authContext);
        res.json(tasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  }

  static async getTask(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const task = await taskService.getTask(authContext, req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  }

  static async createTask(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const task = await taskService.createTask(authContext, req.body);
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Invalid task data" });
    }
  }

  static async updateTask(req: Request, res: Response) {
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

  static async deleteTask(req: Request, res: Response) {
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

  static async reorderTasks(req: Request, res: Response) {
    console.log("🔍 [REORDER] Request received at /api/tasks/reorder");
    console.log("🔍 [REORDER] Method:", req.method);
    
    try {
      const authContext = createAuthContextFromRequest(req);
      const result = await taskService.reorderTasks(authContext, req.body);
      
      res.json(result);
    } catch (error) {
      console.error("Error reordering tasks:", error);
      res.status(400).json({ message: "Failed to reorder tasks" });
    }
  }

  static async getBoardTasks(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const tasks = await taskService.getBoardTasks(authContext, req.params.boardId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching board tasks:", error);
      res.status(500).json({ message: "Failed to fetch board tasks" });
    }
  }

  // Assignee methods
  static async getTaskAssignees(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const assignees = await assigneeService.getTaskAssignees(authContext, req.params.taskId);
      res.json(assignees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task assignees" });
    }
  }

  static async addTaskAssignee(req: Request, res: Response) {
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

  static async removeTaskAssignee(req: Request, res: Response) {
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

  static async setTaskAssignees(req: Request, res: Response) {
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

  static async bulkGetAssignees(req: Request, res: Response) {
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
          console.error(`Error fetching assignees for task ${taskId}:`, error);
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
      console.error("Error in bulk assignees fetch:", error);
      res.status(500).json({ error: "Failed to fetch assignees" });
    }
  }

  // Custom values methods
  static async getTaskCustomValues(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const customValues = await taskService.getTaskCustomValues(authContext, req.params.taskId);
      res.json(customValues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task custom values" });
    }
  }

  static async createTaskCustomValue(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const customValue = await taskService.createTaskCustomValue(authContext, {
        taskId: req.params.taskId,
        ...req.body
      });
      res.status(201).json(customValue);
    } catch (error) {
      res.status(400).json({ message: "Failed to create task custom value" });
    }
  }

  static async updateTaskCustomValue(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const updatedValue = await taskService.updateTaskCustomValue(authContext, req.params.valueId, req.body);
      res.json(updatedValue);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Custom value not found" });
      }
      res.status(400).json({ message: "Failed to update task custom value" });
    }
  }
}