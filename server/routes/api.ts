import { Router } from "express";
import authRoutes from "./auth";
import unifiedAuthRoutes from "./unifiedAuth";
import boardRoutes from "./boards";
import taskRoutes from "./tasks";
import userRoutes from "./users";
import boardShareRoutes from "./boardShares";

const router = Router();

// 🚀 SISTEMA DE AUTENTICAÇÃO UNIFICADO (NOVO)
router.use("/auth-unified", unifiedAuthRoutes);

// Configurar rotas por domínio (mantidas para compatibilidade)
router.use("/auth", authRoutes);
router.use("/boards", boardRoutes);
router.use("/tasks", taskRoutes);
router.use("/users", userRoutes);
router.use("/board-shares", boardShareRoutes);

export default router;