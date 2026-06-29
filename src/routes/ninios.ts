import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getNinios, getNinio, createNinio, updateNinio, deleteNinio } from "../controllers/ninio.controller";

const router = Router();

router.use(requireAuth);

router.get("/",       getNinios);
router.get("/:id",   getNinio);
router.post("/",     createNinio);
router.put("/:id",   updateNinio);
router.delete("/:id", deleteNinio);

export default router;
