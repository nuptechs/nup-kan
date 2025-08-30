import { Router } from "express";
import { TaskController } from "../controllers/taskController";
import { auth, requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(auth); // Popula authContext com dados do JWT
router.use(requireAuth); // Valida se está autenticado

// Task reordering (must come before /:id routes)
router.patch("/reorder", requirePermission("Editar Tarefas"), TaskController.reorderTasks);

// Task CRUD routes
router.get("/", requirePermission("Listar Tarefas"), TaskController.getTasks);
router.get("/:id", requirePermission("Visualizar Tarefas"), TaskController.getTask);
router.post("/", requirePermission("Criar Tarefas"), TaskController.createTask);
router.patch("/:id", requirePermission("Editar Tarefas"), TaskController.updateTask);
router.delete("/:id", requirePermission("Excluir Tarefas"), TaskController.deleteTask);

// Task assignee routes
router.get("/:taskId/assignees", requirePermission("Visualizar Tarefas"), TaskController.getTaskAssignees);
router.post("/:taskId/assignees", requirePermission("Atribuir Membros"), TaskController.addTaskAssignee);
router.delete("/:taskId/assignees/:userId", requirePermission("Atribuir Membros"), TaskController.removeTaskAssignee);
router.put("/:taskId/assignees", requirePermission("Atribuir Membros"), TaskController.setTaskAssignees);

// Bulk operations
router.post("/assignees/bulk", requirePermission("Visualizar Tarefas"), TaskController.bulkGetAssignees);

// Custom values routes
router.get("/:taskId/custom-values", requirePermission("Visualizar Tarefas"), TaskController.getTaskCustomValues);
router.post("/:taskId/custom-values", requirePermission("Editar Tarefas"), TaskController.createTaskCustomValue);
router.patch("/:taskId/custom-values/:valueId", requirePermission("Editar Tarefas"), TaskController.updateTaskCustomValue);

export default router;