import { Router } from "express";
import { BoardController } from "../controllers/boardController";
import { auth, requireAuth, requirePermission } from "../auth/unifiedAuth";

const router = Router();

// Middleware de autenticação aplicado a todas as rotas
router.use(auth); // Popula authContext com dados do JWT
router.use(requireAuth); // Valida se está autenticado

// Board CRUD operations
router.get("/", BoardController.getBoards);
router.get("/:id", BoardController.getBoard);
router.post("/", requirePermission("Criar Boards"), BoardController.createBoard);
router.patch("/:id", requirePermission("Editar Boards"), BoardController.updateBoard);
router.delete("/:id", requirePermission("Excluir Boards"), BoardController.deleteBoard);

// Board status management
router.patch("/:id/toggle-status", requirePermission("Editar Boards"), BoardController.toggleBoardStatus);

export default router;