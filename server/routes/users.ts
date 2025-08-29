import { Router } from "express";
import { UserController } from "../controllers/userController";
import { requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Routes that don't require authentication
router.get("/me", UserController.getCurrentUser);

// Apply authentication middleware to remaining routes  
router.use(requireAuth);

// User CRUD routes
router.get("/", requirePermission("Listar Usuários"), UserController.getUsers);
router.get("/:id", requirePermission("Visualizar Usuários"), UserController.getUser);
router.post("/", requirePermission("Criar Usuários"), UserController.createUser);
router.put("/:id", requirePermission("Editar Usuários"), UserController.updateUser);
router.patch("/:id", UserController.patchUser); // Allow self-editing with conditional permission check
router.delete("/:id", requirePermission("Excluir Usuários"), UserController.deleteUser);

// User permissions
router.get("/:userId/permissions", UserController.getUserPermissions);

// Password management
router.patch("/:id/password", UserController.changePassword);

// User hierarchy
router.get("/:userId/hierarchy", UserController.getUserHierarchy);

export default router;