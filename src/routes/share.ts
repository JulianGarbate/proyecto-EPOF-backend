import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  generateShareToken, revokeShareToken, getPublicShare, getShareToken,
  generateEmergencyToken, revokeEmergencyToken, getPublicEmergencyCard, getEmergencyToken,
} from "../controllers/share.controller";

const router = Router();

// Public — read shared data (must come before /:id to avoid conflict)
router.get("/view/:token", getPublicShare);
router.get("/emergency/:token", getPublicEmergencyCard);

// Protected — manage emergency token (must come before /:id to avoid conflict)
router.get("/:id/emergency",    requireAuth, getEmergencyToken);
router.post("/:id/emergency",   requireAuth, generateEmergencyToken);
router.delete("/:id/emergency", requireAuth, revokeEmergencyToken);

// Protected — manage share token
router.get("/:id",    requireAuth, getShareToken);
router.post("/:id",   requireAuth, generateShareToken);
router.delete("/:id", requireAuth, revokeShareToken);

export default router;
