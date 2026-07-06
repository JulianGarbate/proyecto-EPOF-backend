import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import {
  listCuidadores,
  inviteCuidador,
  getInviteDetails,
  acceptInvite,
  updatePermissions,
  removeCuidador,
  myAssignments,
} from "../controllers/caregiver.controller";

const router = Router();

// All routes require auth
router.use(requireAuth);

// Cuidador routes (must be before /:ninioId to avoid pattern clash)
// Cualquier usuario autenticado puede aceptar una invitación y ver sus
// asignaciones: un tutor también puede ser cuidador del niño de otra persona.
router.get("/invite/:token", getInviteDetails);
router.post("/accept",       acceptInvite);
router.get("/my",            myAssignments);

// Tutor routes
router.get("/:ninioId",                           requireRole("TUTOR"), listCuidadores);
router.post("/:ninioId/invite",                   requireRole("TUTOR"), inviteCuidador);
router.put("/:ninioId/:cuidadorId/permissions",   requireRole("TUTOR"), updatePermissions);
router.delete("/:ninioId/:cuidadorId",            requireRole("TUTOR"), removeCuidador);

export default router;
