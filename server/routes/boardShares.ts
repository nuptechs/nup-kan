import { Router } from "express";
import { BoardController } from "../controllers/boardController";
import { requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(requireAuth);

// Board share CRUD operations
router.get("/", requirePermission("Listar Boards"), BoardController.getAllBoardShares);
router.post("/", requirePermission("Editar Boards"), BoardController.createBoardShare);
router.patch("/:id", requirePermission("Editar Boards"), BoardController.updateBoardShare);
router.delete("/:id", requirePermission("Editar Boards"), BoardController.deleteBoardShare);

// Board-specific sharing information
router.get("/boards/:boardId/shares", BoardController.getBoardShares);
router.get("/boards/:boardId/members", BoardController.getBoardMembers);
router.get("/boards/:boardId/member-count", BoardController.getBoardMemberCount);

// User and team board shares
router.get("/users/:userId/shared-boards", BoardController.getUserSharedBoards);
router.get("/teams/:teamId/shared-boards", BoardController.getTeamSharedBoards);

// Permission checks
router.get("/users/:userId/boards/:boardId/permission", BoardController.getUserBoardPermission);

export default router;