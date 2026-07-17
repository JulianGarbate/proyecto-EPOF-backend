import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middlewares/requireAuth";
import {
  generateShareToken, revokeShareToken, getPublicShare, getShareToken,
  generateEmergencyToken, revokeEmergencyToken, getPublicEmergencyCard, getEmergencyToken,
} from "../controllers/share.controller";

// Los tokens son UUIDs (122 bits) — inadivinables por fuerza bruta en la práctica,
// pero estos son los únicos endpoints sin auth de todo el backend, así que igual
// se limita por IP para frenar scraping/DoS.
const publicTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intente de nuevo en unos minutos." },
});

const router = Router();

// Public — read shared data (must come before /:id to avoid conflict)
router.get("/view/:token", publicTokenLimiter, getPublicShare);
router.get("/emergency/:token", publicTokenLimiter, getPublicEmergencyCard);

// Protected — manage emergency token (must come before /:id to avoid conflict)
router.get("/:id/emergency",    requireAuth, getEmergencyToken);
router.post("/:id/emergency",   requireAuth, generateEmergencyToken);
router.delete("/:id/emergency", requireAuth, revokeEmergencyToken);

// Protected — manage share token
router.get("/:id",    requireAuth, getShareToken);
router.post("/:id",   requireAuth, generateShareToken);
router.delete("/:id", requireAuth, revokeShareToken);

export default router;
