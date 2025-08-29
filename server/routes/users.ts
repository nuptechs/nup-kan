import { Router } from "express";
import { UserController } from "../controllers/userController";
import { AuthMiddlewareJWT } from "../microservices/authServiceJWT";

const router = Router();

// Routes that don't require authentication
router.get("/me", UserController.getCurrentUser);

// Apply authentication middleware to remaining routes  
router.use(AuthMiddlewareJWT.requireAuth);

// User CRUD routes
router.get("/", AuthMiddlewareJWT.requirePermissions("Listar Usuários"), UserController.getUsers);
router.get("/:id", AuthMiddlewareJWT.requirePermissions("Visualizar Usuários"), UserController.getUser);
router.post("/", AuthMiddlewareJWT.requirePermissions("Criar Usuários"), UserController.createUser);
router.put("/:id", AuthMiddlewareJWT.requirePermissions("Editar Usuários"), UserController.updateUser);
router.patch("/:id", UserController.patchUser); // Allow self-editing with conditional permission check
router.delete("/:id", AuthMiddlewareJWT.requirePermissions("Excluir Usuários"), UserController.deleteUser);

// User permissions
router.get("/:userId/permissions", UserController.getUserPermissions);

// Password management
router.patch("/:id/password", UserController.changePassword);

// User hierarchy
router.get("/:userId/hierarchy", UserController.getUserHierarchy);

export default router;