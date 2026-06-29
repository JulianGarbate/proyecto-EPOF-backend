import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

// Verifica que el niño le pertenezca al usuario autenticado
async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// GET /api/patients/:id/medications
export async function getMedications(req: AuthRequest, res: Response) {
  const ninio = await ownedNinio(req.params.id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const meds = await prisma.medicacion.findMany({
    where: { ninioId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ medications: meds });
}

// POST /api/patients/:id/medications
export async function createMedication(req: AuthRequest, res: Response) {
  const ninio = await ownedNinio(req.params.id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const { name, dose, horarios, dias } = req.body;
  if (!name || !dose) {
    res.status(400).json({ error: "Nombre y dosis son requeridos" });
    return;
  }

  const med = await prisma.medicacion.create({
    data: {
      ninioId: req.params.id,
      name,
      dose,
      horarios: horarios ?? "",
      dias: Array.isArray(dias) ? dias.map(Number) : [],
    },
  });
  res.status(201).json({ medication: med });
}

// DELETE /api/patients/:id/medications/:medId
export async function deleteMedication(req: AuthRequest, res: Response) {
  const ninio = await ownedNinio(req.params.id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const med = await prisma.medicacion.findFirst({
    where: { id: req.params.medId, ninioId: req.params.id },
  });
  if (!med) { res.status(404).json({ error: "Medicamento no encontrado" }); return; }

  await prisma.medicacion.delete({ where: { id: req.params.medId } });
  res.json({ ok: true });
}
