import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { getMedications, createMedication, updateMedication, deleteMedication } from "../controllers/medications.controller";
import { getConsultas, createConsulta, updateConsulta, deleteConsulta } from "../controllers/consultas.controller";
import { getMedicationAnalysis } from "../controllers/analysis.controller";

const router = Router();
router.use(requireAuth);

router.get("/:id/medication-analysis",    getMedicationAnalysis);

router.get("/:id/medications",            getMedications);
router.post("/:id/medications",           requireRole("TUTOR"), createMedication);
router.put("/:id/medications/:medId",     requireRole("TUTOR"), updateMedication);
router.delete("/:id/medications/:medId",  requireRole("TUTOR"), deleteMedication);

router.get("/:id/consultas",                  getConsultas);
router.post("/:id/consultas",                 requireRole("TUTOR"), createConsulta);
router.put("/:id/consultas/:consultaId",      requireRole("TUTOR"), updateConsulta);
router.delete("/:id/consultas/:consultaId",   requireRole("TUTOR"), deleteConsulta);

export default router;
