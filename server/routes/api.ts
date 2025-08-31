import { Router } from "express";
import authRoutes from "./auth";
import boardRoutes from "./boards";
import taskRoutes from "./tasks";
import userRoutes from "./users";
import boardShareRoutes from "./boardShares";
import permissionsRoutes from "./permissions";

const router = Router();

// Configurar rotas por domínio
router.use("/auth", authRoutes);
router.use("/boards", boardRoutes);
router.use("/tasks", taskRoutes);
router.use("/users", userRoutes);
router.use("/board-shares", boardShareRoutes);

// Adicionar rotas de permissões (teams, profiles, permissions)
router.use("/", permissionsRoutes);

export default router;