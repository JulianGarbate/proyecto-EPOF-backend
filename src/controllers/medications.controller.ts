import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// GET /api/patients/:id/medications
export async function getMedications(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const meds = await prisma.medicacion.findMany({
    where: { ninioId: id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ medications: meds });
}

// POST /api/patients/:id/medications
export async function createMedication(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const { name, dose, horarios, dias, efectosSubida, efectosBajada, efectosMantenida } = req.body;
  if (!name || !dose) { res.status(400).json({ error: "Nombre y dosis son requeridos" }); return; }

  const med = await prisma.medicacion.create({
    data: {
      ninioId: id, name, dose,
      horarios: horarios ?? "",
      dias: Array.isArray(dias) ? dias.map(Number) : [],
      efectosSubida:    efectosSubida    ?? null,
      efectosBajada:    efectosBajada    ?? null,
      efectosMantenida: efectosMantenida ?? null,
    },
  });
  res.status(201).json({ medication: med });
}

// PUT /api/patients/:id/medications/:medId
export async function updateMedication(req: AuthRequest, res: Response) {
  const id    = req.params.id    as string;
  const medId = req.params.medId as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const med = await prisma.medicacion.findFirst({ where: { id: medId, ninioId: id } });
  if (!med) { res.status(404).json({ error: "Medicamento no encontrado" }); return; }

  const { name, dose, horarios, dias, efectosSubida, efectosBajada, efectosMantenida } = req.body;
  const updated = await prisma.medicacion.update({
    where: { id: medId },
    data: {
      ...(name && { name }),
      ...(dose && { dose }),
      ...(horarios !== undefined && { horarios }),
      ...(dias !== undefined && { dias: (dias as number[]).map(Number) }),
      ...(efectosSubida    !== undefined && { efectosSubida }),
      ...(efectosBajada    !== undefined && { efectosBajada }),
      ...(efectosMantenida !== undefined && { efectosMantenida }),
    },
  });
  res.json({ medication: updated });
}

// DELETE /api/patients/:id/medications/:medId
export async function deleteMedication(req: AuthRequest, res: Response) {
  const id    = req.params.id    as string;
  const medId = req.params.medId as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const med = await prisma.medicacion.findFirst({ where: { id: medId, ninioId: id } });
  if (!med) { res.status(404).json({ error: "Medicamento no encontrado" }); return; }

  await prisma.medicacion.delete({ where: { id: medId } });
  res.json({ ok: true });
}
