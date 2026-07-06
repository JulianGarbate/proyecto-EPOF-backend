import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
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
router.get("/invite/:token", getInviteDetails);
router.post("/accept",       acceptInvite);
router.get("/my",            myAssignments);

// Tutor routes
router.get("/:ninioId",                           listCuidadores);
router.post("/:ninioId/invite",                   inviteCuidador);
router.put("/:ninioId/:cuidadorId/permissions",   updatePermissions);
router.delete("/:ninioId/:cuidadorId",            removeCuidador);

export default router;
