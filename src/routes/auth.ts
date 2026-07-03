import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, register, me } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/requireAuth";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados registros desde esta IP. Intente de nuevo en una hora." },
});

const router = Router();

router.post("/login",    loginLimiter,    login);
router.post("/register", registerLimiter, register);
router.get("/me",        requireAuth,     me);

export default router;
