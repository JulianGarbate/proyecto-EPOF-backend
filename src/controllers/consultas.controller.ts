import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// GET /api/patients/:id/consultas
export async function getConsultas(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const consultas = await prisma.consulta.findMany({
    where: { ninioId: id },
    orderBy: { date: "desc" },
  });
  res.json({ consultas });
}

// POST /api/patients/:id/consultas
export async function createConsulta(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const { date, doctor, specialty, summary, indications, nextDate } = req.body;
  if (!date || !doctor || !summary) {
    res.status(400).json({ error: "Fecha, médico y resumen son requeridos" });
    return;
  }

  const consulta = await prisma.consulta.create({
    data: {
      ninioId: id, date, doctor,
      specialty: specialty ?? null,
      summary,
      indications: indications ?? null,
      nextDate: nextDate ?? null,
    },
  });
  res.status(201).json({ consulta });
}

// PUT /api/patients/:id/consultas/:consultaId
export async function updateConsulta(req: AuthRequest, res: Response) {
  const id         = req.params.id         as string;
  const consultaId = req.params.consultaId as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const existing = await prisma.consulta.findFirst({ where: { id: consultaId, ninioId: id } });
  if (!existing) { res.status(404).json({ error: "Consulta no encontrada" }); return; }

  const { date, doctor, specialty, summary, indications, nextDate } = req.body;
  const updated = await prisma.consulta.update({
    where: { id: consultaId },
    data: {
      ...(date        && { date }),
      ...(doctor      && { doctor }),
      ...(specialty   !== undefined && { specialty: specialty ?? null }),
      ...(summary     && { summary }),
      ...(indications !== undefined && { indications: indications ?? null }),
      ...(nextDate    !== undefined && { nextDate: nextDate ?? null }),
    },
  });
  res.json({ consulta: updated });
}

// DELETE /api/patients/:id/consultas/:consultaId
export async function deleteConsulta(req: AuthRequest, res: Response) {
  const id         = req.params.id         as string;
  const consultaId = req.params.consultaId as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const existing = await prisma.consulta.findFirst({ where: { id: consultaId, ninioId: id } });
  if (!existing) { res.status(404).json({ error: "Consulta no encontrada" }); return; }

  await prisma.consulta.delete({ where: { id: consultaId } });
  res.json({ ok: true });
}
