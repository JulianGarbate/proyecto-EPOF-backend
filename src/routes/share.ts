import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { generateShareToken, revokeShareToken, getPublicShare } from "../controllers/share.controller";

const router = Router();

// Protected — manage share token
router.post("/:id",   requireAuth, generateShareToken);
router.delete("/:id", requireAuth, revokeShareToken);

// Public — read shared data
router.get("/view/:token", getPublicShare);

export default router;
