import { Router } from "express";
import authRoutes from "./auth";
import boardRoutes from "./boards";
import taskRoutes from "./tasks";
import userRoutes from "./users";
import boardShareRoutes from "./boardShares";

const router = Router();

// Configurar rotas por domínio
router.use("/auth", authRoutes);
router.use("/boards", boardRoutes);
router.use("/tasks", taskRoutes);
router.use("/users", userRoutes);
router.use("/board-shares", boardShareRoutes);

export default router;