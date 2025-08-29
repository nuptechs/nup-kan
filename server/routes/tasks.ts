import { Router } from "express";
import { TaskController } from "../controllers/taskController";
import { AuthMiddlewareJWT } from "../microservices/authServiceJWT";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(AuthMiddlewareJWT.requireAuth);

// Task CRUD routes
router.get("/", AuthMiddlewareJWT.requirePermissions("Listar Tarefas"), TaskController.getTasks);
router.get("/:id", AuthMiddlewareJWT.requirePermissions("Visualizar Tarefas"), TaskController.getTask);
router.post("/", AuthMiddlewareJWT.requirePermissions("Criar Tarefas"), TaskController.createTask);
router.patch("/:id", AuthMiddlewareJWT.requirePermissions("Editar Tarefas"), TaskController.updateTask);
router.delete("/:id", AuthMiddlewareJWT.requirePermissions("Excluir Tarefas"), TaskController.deleteTask);

// Task reordering (must come before /:id routes)
router.patch("/reorder", AuthMiddlewareJWT.requirePermissions("Editar Tarefas"), TaskController.reorderTasks);

// Task assignee routes
router.get("/:taskId/assignees", AuthMiddlewareJWT.requirePermissions("Visualizar Tarefas"), TaskController.getTaskAssignees);
router.post("/:taskId/assignees", AuthMiddlewareJWT.requirePermissions("Atribuir Membros"), TaskController.addTaskAssignee);
router.delete("/:taskId/assignees/:userId", AuthMiddlewareJWT.requirePermissions("Atribuir Membros"), TaskController.removeTaskAssignee);
router.put("/:taskId/assignees", AuthMiddlewareJWT.requirePermissions("Atribuir Membros"), TaskController.setTaskAssignees);

// Bulk operations
router.post("/assignees/bulk", TaskController.bulkGetAssignees);

// Custom values routes
router.get("/:taskId/custom-values", TaskController.getTaskCustomValues);
router.post("/:taskId/custom-values", TaskController.createTaskCustomValue);
router.patch("/:taskId/custom-values/:valueId", TaskController.updateTaskCustomValue);

export default router;