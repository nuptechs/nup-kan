import { Router } from "express";
import { TaskController } from "../controllers/taskController";
import { auth, requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(auth); // Popula authContext com dados do JWT
router.use(requireAuth); // Valida se está autenticado

// Task reordering (must come before /:id routes)
router.patch("/reorder", requirePermission("Edit Tasks"), TaskController.reorderTasks);

// Task CRUD routes
router.get("/", requirePermission("List Tasks"), TaskController.getTasks);
router.get("/:id", requirePermission("View Tasks"), TaskController.getTask);
router.post("/", requirePermission("Create Tasks"), TaskController.createTask);
router.patch("/:id", requirePermission("Edit Tasks"), TaskController.updateTask);
router.delete("/:id", requirePermission("Delete Tasks"), TaskController.deleteTask);

// Task assignee routes
router.get("/:taskId/assignees", requirePermission("View Tasks"), TaskController.getTaskAssignees);
router.post("/:taskId/assignees", requirePermission("Assign Members"), TaskController.addTaskAssignee);
router.delete("/:taskId/assignees/:userId", requirePermission("Assign Members"), TaskController.removeTaskAssignee);
router.put("/:taskId/assignees", requirePermission("Assign Members"), TaskController.setTaskAssignees);

// Bulk operations
router.post("/assignees/bulk", requirePermission("View Tasks"), TaskController.bulkGetAssignees);

// Custom values routes
router.get("/:taskId/custom-values", requirePermission("View Tasks"), TaskController.getTaskCustomValues);
router.post("/:taskId/custom-values", requirePermission("Edit Tasks"), TaskController.createTaskCustomValue);
router.patch("/:taskId/custom-values/:valueId", requirePermission("Edit Tasks"), TaskController.updateTaskCustomValue);

export default router;