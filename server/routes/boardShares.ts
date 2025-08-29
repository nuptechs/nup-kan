import { Router } from "express";
import { BoardController } from "../controllers/boardController";
import { AuthMiddlewareJWT } from "../microservices/authServiceJWT";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(AuthMiddlewareJWT.requireAuth);

// Board sharing routes
router.get("/", BoardController.getAllBoardShares);
router.post("/", AuthMiddlewareJWT.requirePermissions("Gerenciar Times"), BoardController.createBoardShare);
router.patch("/:id", AuthMiddlewareJWT.requirePermissions("Gerenciar Times"), BoardController.updateBoardShare);
router.delete("/:id", AuthMiddlewareJWT.requirePermissions("Gerenciar Times"), BoardController.deleteBoardShare);

// User and team board shares
router.get("/users/:userId/shared-boards", BoardController.getUserSharedBoards);
router.get("/teams/:teamId/shared-boards", BoardController.getTeamSharedBoards);

// Board permission check
router.get("/users/:userId/boards/:boardId/permission", BoardController.getUserBoardPermission);

export default router;