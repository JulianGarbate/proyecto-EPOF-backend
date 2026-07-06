import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { getNinios, getNinio, createNinio, updateNinio, deleteNinio } from "../controllers/ninio.controller";

const router = Router();

router.use(requireAuth);

router.get("/",       getNinios);
router.get("/:id",   getNinio);
router.post("/",     requireRole("TUTOR"), createNinio);
router.put("/:id",   requireRole("TUTOR"), updateNinio);
router.delete("/:id", requireRole("TUTOR"), deleteNinio);

export default router;
