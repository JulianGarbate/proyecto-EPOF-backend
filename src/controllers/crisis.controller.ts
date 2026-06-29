import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// POST /api/crisis — inicia una crisis, devuelve el id para el cronómetro
export async function startCrisis(req: AuthRequest, res: Response) {
  const { ninioId } = req.body;
  if (!ninioId) { res.status(400).json({ error: "ninioId es requerido" }); return; }

  const ninio = await ownedNinio(ninioId, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const crisis = await prisma.crisis.create({
    data: { ninioId, startTime: new Date().toISOString(), endTime: "" },
  });
  res.status(201).json({ crisis });
}

// PUT /api/crisis/:id/end — finaliza la crisis y calcula duración
export async function endCrisis(req: AuthRequest, res: Response) {
  const existing = await prisma.crisis.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: "Crisis no encontrada" }); return; }

  const ninio = await ownedNinio(existing.ninioId, req.userId!);
  if (!ninio) { res.status(403).json({ error: "Sin permiso" }); return; }

  const endTime = new Date().toISOString();
  const durationSec = Math.round(
    (new Date(endTime).getTime() - new Date(existing.startTime).getTime()) / 1000
  );

  const crisis = await prisma.crisis.update({
    where: { id: req.params.id },
    data: { endTime, durationSec },
  });
  res.json({ crisis });
}
