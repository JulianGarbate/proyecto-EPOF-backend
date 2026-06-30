import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getMedications, createMedication, updateMedication, deleteMedication } from "../controllers/medications.controller";
import { getConsultas, createConsulta, updateConsulta, deleteConsulta } from "../controllers/consultas.controller";

const router = Router();
router.use(requireAuth);

router.get("/:id/medications",            getMedications);
router.post("/:id/medications",           createMedication);
router.put("/:id/medications/:medId",     updateMedication);
router.delete("/:id/medications/:medId",  deleteMedication);

router.get("/:id/consultas",                  getConsultas);
router.post("/:id/consultas",                 createConsulta);
router.put("/:id/consultas/:consultaId",      updateConsulta);
router.delete("/:id/consultas/:consultaId",   deleteConsulta);

export default router;
