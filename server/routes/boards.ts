import { Router } from "express";
import { BoardController } from "../controllers/boardController";
import { requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(requireAuth);

// Board CRUD routes
router.get("/", BoardController.getBoards);
router.get("/:id", BoardController.getBoard);
router.post("/", requirePermission("Criar Boards"), BoardController.createBoard);
router.patch("/:id", requirePermission("Editar Boards"), BoardController.updateBoard);
router.delete("/:id", requirePermission("Excluir Boards"), BoardController.deleteBoard);

// Board status toggle
router.patch("/:id/toggle-status", requirePermission("Editar Boards"), BoardController.toggleBoardStatus);

// Board sharing routes
router.get("/:boardId/shares", BoardController.getBoardShares);
router.get("/:boardId/members", BoardController.getBoardMembers);
router.get("/:boardId/member-count", BoardController.getBoardMemberCount);

export default router;