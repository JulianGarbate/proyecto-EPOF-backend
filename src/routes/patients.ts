import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { getMedications, createMedication, updateMedication, deleteMedication } from "../controllers/medications.controller";
import { getConsultas, createConsulta, updateConsulta, deleteConsulta } from "../controllers/consultas.controller";
import { getMedicationAnalysis } from "../controllers/analysis.controller";
import { getSensoryLogs, createSensoryLog, deleteSensoryLog } from "../controllers/sensoryLog.controller";
import { getHospitalizaciones, createHospitalizacion, updateHospitalizacion, deleteHospitalizacion } from "../controllers/hospitalizacion.controller";
import { getObjetivos, createObjetivo, updateObjetivo, deleteObjetivo, markObjetivoLogrado } from "../controllers/objetivoTerapeutico.controller";

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

// Diario sensorial — igual que el tracker, cuidadores con canFillTracker pueden cargar
router.get("/:id/sensory-logs",               getSensoryLogs);
router.post("/:id/sensory-logs",              createSensoryLog);
router.delete("/:id/sensory-logs/:logId",     deleteSensoryLog);

router.get("/:id/hospitalizaciones",                 getHospitalizaciones);
router.post("/:id/hospitalizaciones",                requireRole("TUTOR"), createHospitalizacion);
router.put("/:id/hospitalizaciones/:hospId",         requireRole("TUTOR"), updateHospitalizacion);
router.delete("/:id/hospitalizaciones/:hospId",      requireRole("TUTOR"), deleteHospitalizacion);

router.get("/:id/objetivos",                          getObjetivos);
router.post("/:id/objetivos",                         requireRole("TUTOR"), createObjetivo);
router.put("/:id/objetivos/:objetivoId/logrado",      markObjetivoLogrado); // cuidadores con canFillTracker, sin requireRole
router.put("/:id/objetivos/:objetivoId",              requireRole("TUTOR"), updateObjetivo);
router.delete("/:id/objetivos/:objetivoId",           requireRole("TUTOR"), deleteObjetivo);

export default router;
