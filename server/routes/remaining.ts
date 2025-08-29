import { Router } from "express";
import type { Request, Response } from "express";
import { AuthMiddlewareJWT } from "../microservices/authServiceJWT";
import { 
  boardService, 
  taskService, 
  userService, 
  teamService, 
  notificationService, 
  columnService, 
  tagService, 
  profileService, 
  permissionService,
  taskStatusService,
  hierarchyService,
  exportService
} from "../services";

const router = Router();

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
    profileName: null,
    teams: [],
    sessionId: req.session?.id || 'no-session',
    isAuthenticated: !!userId,
    lastActivity: new Date()
  };
}

// System routes
router.get("/system/health", async (req: Request, res: Response) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get("/system/metrics", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    
    // Buscar métricas básicas
    const users = await userService.getUsers(authContext);
    const boards = await boardService.getBoards(authContext, { page: 1, limit: 1000 });
    const tasks: any[] = []; // Mock data for tasks
    
    res.json({
      users: users.length,
      boards: boards.length,
      tasks: tasks.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// Performance stats route
router.get("/performance-stats", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const { OptimizedQueries } = await import("../optimizedQueries");
    const stats = { queries: 0, cached: 0, performance: 'good' }; // Mock stats
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch performance stats" });
  }
});

// Analytics route
router.get("/analytics", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    
    // Buscar dados para analytics
    const tasks: any[] = []; // Mock data for tasks
    const boards = await boardService.getBoards(authContext, { page: 1, limit: 1000 });
    
    const analytics = {
      totalTasks: tasks.length,
      totalBoards: boards.length,
      tasksByStatus: tasks.reduce((acc: any, task: any) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {}),
      boardsByStatus: boards.reduce((acc: any, board: any) => {
        const status = board.isActive ? 'active' : 'inactive';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// Columns routes
router.get("/boards/:boardId/columns", async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const columns = await columnService.getColumns(authContext);
    res.json(columns);
  } catch (error) {
    console.error("Error fetching board columns:", error);
    res.status(500).json({ message: "Failed to fetch board columns" });
  }
});

router.get("/columns", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const columns = await columnService.getColumns(authContext);
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch columns" });
  }
});

router.get("/columns/:id", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const column = await columnService.getColumn(authContext, req.params.id);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }
    res.json(column);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch column" });
  }
});

router.post("/columns", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const column = await columnService.createColumn(authContext, req.body);
    res.status(201).json(column);
  } catch (error) {
    res.status(400).json({ message: "Invalid column data" });
  }
});

router.patch("/columns/:id", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const updatedColumn = await columnService.updateColumn(authContext, req.params.id, req.body);
    res.json(updatedColumn);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ message: "Column not found" });
    }
    res.status(400).json({ message: "Invalid column data" });
  }
});

router.delete("/columns/:id", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    await columnService.deleteColumn(authContext, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ message: "Column not found" });
    }
    res.status(500).json({ message: "Failed to delete column" });
  }
});

router.post("/columns/reorder", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const result = await columnService.reorderColumns(authContext, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: "Failed to reorder columns" });
  }
});

// Tags routes
router.get("/tags", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const tags = await tagService.getTags(authContext);
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tags" });
  }
});

router.get("/tags/:id", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const tag = await tagService.getTag(authContext, req.params.id);
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }
    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tag" });
  }
});

router.post("/tags", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const tag = await tagService.createTag(authContext, req.body);
    res.status(201).json(tag);
  } catch (error) {
    res.status(400).json({ message: "Invalid tag data" });
  }
});

router.put("/tags/:id", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    const updatedTag = await tagService.updateTag(authContext, req.params.id, req.body);
    res.json(updatedTag);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ message: "Tag not found" });
    }
    res.status(400).json({ message: "Invalid tag data" });
  }
});

router.delete("/tags/:id", AuthMiddlewareJWT.requireAuth, async (req: Request, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    await tagService.deleteTag(authContext, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ message: "Tag not found" });
    }
    res.status(500).json({ message: "Failed to delete tag" });
  }
});

export default router;