import { Router } from "express";
import { UserController } from "../controllers/userController";
import { auth, requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Apply authentication middleware to all routes
router.use(auth); // Popula authContext com dados do JWT
router.use(requireAuth); // Valida se está autenticado

// Current user route (requires authentication)
router.get("/me", UserController.getCurrentUser);

// User CRUD routes
router.get("/", requirePermission("List Users"), UserController.getUsers);
router.get("/:id", requirePermission("Edit Users"), UserController.getUser);
router.post("/", requirePermission("Create Users"), UserController.createUser);
router.put("/:id", requirePermission("Edit Users"), UserController.updateUser);
router.patch("/:id", UserController.patchUser); // Allow self-editing with conditional permission check
router.delete("/:id", requirePermission("Delete Users"), UserController.deleteUser);

// User permissions
router.get("/:userId/permissions", UserController.getUserPermissions);

// Password management
router.patch("/:id/password", UserController.changePassword);

// User hierarchy
router.get("/:userId/hierarchy", UserController.getUserHierarchy);

export default router;