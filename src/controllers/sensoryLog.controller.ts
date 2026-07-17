import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";
import { accessibleNinio } from "../lib/access";

// GET /api/patients/:id/sensory-logs
export async function getSensoryLogs(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await accessibleNinio(id, req.userId!, ["canSeeHistory", "canFillTracker"]);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const logs = await prisma.sensoryLog.findMany({
    where: { ninioId: id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  res.json({ logs });
}

// POST /api/patients/:id/sensory-logs
export async function createSensoryLog(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await accessibleNinio(id, req.userId!, ["canFillTracker"]);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const { date, time, context, stimulus, stimulusDetail, response } = req.body;
  if (!date || !context || !response) {
    res.status(400).json({ error: "Fecha, contexto y respuesta son requeridos" });
    return;
  }

  const log = await prisma.sensoryLog.create({
    data: {
      ninioId: id, date,
      time: time ?? null,
      context, response,
      stimulus: Array.isArray(stimulus) ? stimulus : [],
      stimulusDetail: stimulusDetail ?? null,
    },
  });
  res.status(201).json({ log });
}

// DELETE /api/patients/:id/sensory-logs/:logId
export async function deleteSensoryLog(req: AuthRequest, res: Response) {
  const id    = req.params.id    as string;
  const logId = req.params.logId as string;
  const ninio = await accessibleNinio(id, req.userId!, ["canFillTracker"]);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const existing = await prisma.sensoryLog.findFirst({ where: { id: logId, ninioId: id } });
  if (!existing) { res.status(404).json({ error: "Registro no encontrado" }); return; }

  await prisma.sensoryLog.delete({ where: { id: logId } });
  res.json({ ok: true });
}
