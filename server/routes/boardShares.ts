import { Router } from "express";
import { BoardController } from "../controllers/boardController";
import { requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(requireAuth);

// Board sharing routes
router.get("/", BoardController.getAllBoardShares);
router.post("/", requirePermission("Gerenciar Times"), BoardController.createBoardShare);
router.patch("/:id", requirePermission("Gerenciar Times"), BoardController.updateBoardShare);
router.delete("/:id", requirePermission("Gerenciar Times"), BoardController.deleteBoardShare);

// User and team board shares
router.get("/users/:userId/shared-boards", BoardController.getUserSharedBoards);
router.get("/teams/:teamId/shared-boards", BoardController.getTeamSharedBoards);

// Board permission check
router.get("/users/:userId/boards/:boardId/permission", BoardController.getUserBoardPermission);

export default router;