import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { requireAuth } from "../auth/unifiedAuth";

const router = Router();

// Rotas de autenticação consolidadas
router.post("/login", AuthController.login);
router.post("/change-first-password", AuthController.changeFirstPassword);
router.post("/dev-login", AuthController.devLogin);
router.get("/current-user", AuthController.currentUser);
router.post("/logout", AuthController.logout);
router.post("/refresh-token", AuthController.refreshToken);


export default router;