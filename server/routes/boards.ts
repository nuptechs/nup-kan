import { Router } from "express";
import { BoardController } from "../controllers/boardController";
import { AuthMiddlewareJWT } from "../microservices/authServiceJWT";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(AuthMiddlewareJWT.requireAuth);

// Board CRUD routes
router.get("/", BoardController.getBoards);
router.get("/:id", BoardController.getBoard);
router.post("/", AuthMiddlewareJWT.requirePermissions("Criar Boards"), BoardController.createBoard);
router.patch("/:id", AuthMiddlewareJWT.requirePermissions("Editar Boards"), BoardController.updateBoard);
router.delete("/:id", AuthMiddlewareJWT.requirePermissions("Excluir Boards"), BoardController.deleteBoard);

// Board status toggle
router.patch("/:id/toggle-status", AuthMiddlewareJWT.requirePermissions("Editar Boards"), BoardController.toggleBoardStatus);

// Board sharing routes
router.get("/:boardId/shares", BoardController.getBoardShares);
router.get("/:boardId/members", BoardController.getBoardMembers);
router.get("/:boardId/member-count", BoardController.getBoardMemberCount);

export default router;