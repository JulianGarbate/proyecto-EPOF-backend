import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { startCrisis, endCrisis } from "../controllers/crisis.controller";

const router = Router();
router.use(requireAuth);

router.post("/",         startCrisis);
router.put("/:id/end",   endCrisis);

export default router;
