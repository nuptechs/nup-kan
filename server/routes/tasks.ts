import { Router } from "express";
import { TaskController } from "../controllers/taskController";
import { requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(requireAuth);

// Task CRUD routes
router.get("/", requirePermission("Listar Tarefas"), TaskController.getTasks);
router.get("/:id", requirePermission("Visualizar Tarefas"), TaskController.getTask);
router.post("/", requirePermission("Criar Tarefas"), TaskController.createTask);
router.patch("/:id", requirePermission("Editar Tarefas"), TaskController.updateTask);
router.delete("/:id", requirePermission("Excluir Tarefas"), TaskController.deleteTask);

// Task reordering (must come before /:id routes)
router.patch("/reorder", requirePermission("Editar Tarefas"), TaskController.reorderTasks);

// Task assignee routes
router.get("/:taskId/assignees", requirePermission("Visualizar Tarefas"), TaskController.getTaskAssignees);
router.post("/:taskId/assignees", requirePermission("Atribuir Membros"), TaskController.addTaskAssignee);
router.delete("/:taskId/assignees/:userId", requirePermission("Atribuir Membros"), TaskController.removeTaskAssignee);
router.put("/:taskId/assignees", requirePermission("Atribuir Membros"), TaskController.setTaskAssignees);

// Bulk operations
router.post("/assignees/bulk", TaskController.bulkGetAssignees);

// Custom values routes
router.get("/:taskId/custom-values", TaskController.getTaskCustomValues);
router.post("/:taskId/custom-values", TaskController.createTaskCustomValue);
router.patch("/:taskId/custom-values/:valueId", TaskController.updateTaskCustomValue);

export default router;