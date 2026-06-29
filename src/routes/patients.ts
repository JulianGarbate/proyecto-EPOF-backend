import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getMedications, createMedication, deleteMedication } from "../controllers/medications.controller";

const router = Router();
router.use(requireAuth);

router.get("/:id/medications",            getMedications);
router.post("/:id/medications",           createMedication);
router.delete("/:id/medications/:medId",  deleteMedication);

export default router;
