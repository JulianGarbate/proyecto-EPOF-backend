import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { generateShareToken, revokeShareToken, getPublicShare, getShareToken } from "../controllers/share.controller";

const router = Router();

// Public — read shared data (must come before /:id to avoid conflict)
router.get("/view/:token", getPublicShare);

// Protected — manage share token
router.get("/:id",    requireAuth, getShareToken);
router.post("/:id",   requireAuth, generateShareToken);
router.delete("/:id", requireAuth, revokeShareToken);

export default router;
