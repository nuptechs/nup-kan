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
router.post("/", requirePermission("Create Boards"), BoardController.createBoard);
router.patch("/:id", requirePermission("Edit Boards"), BoardController.updateBoard);
router.delete("/:id", requirePermission("Delete Boards"), BoardController.deleteBoard);

// Board status management
router.patch("/:id/toggle-status", requirePermission("Edit Boards"), BoardController.toggleBoardStatus);

export default router;