import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

// GET /api/ninios
export async function getNinios(req: AuthRequest, res: Response) {
  const ninios = await prisma.ninio.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "asc" },
  });
  res.json({ ninios });
}

// GET /api/ninios/:id
export async function getNinio(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!ninio) { res.status(404).json({ error: "Niño no encontrado" }); return; }
  res.json({ ninio });
}

// POST /api/ninios
export async function createNinio(req: AuthRequest, res: Response) {
  const { fullName, weight, height, age, diagnosticos, rescueMed, rescueDose, alertMinutes, ambulanceMinutes, emergencyPhone } = req.body;

  if (!fullName || weight == null || height == null || age == null || !diagnosticos?.length) {
    res.status(400).json({ error: "Todos los campos son requeridos" });
    return;
  }

  const ninio = await prisma.ninio.create({
    data: {
      fullName,
      weight: parseFloat(weight),
      height: parseFloat(height),
      age: parseInt(age),
      diagnosticos: Array.isArray(diagnosticos) ? diagnosticos : [diagnosticos],
      userId: req.userId,
      rescueMed:        rescueMed        ?? null,
      rescueDose:       rescueDose       ?? null,
      alertMinutes:     alertMinutes     != null ? parseInt(alertMinutes)     : null,
      ambulanceMinutes: ambulanceMinutes != null ? parseInt(ambulanceMinutes) : null,
      emergencyPhone:   emergencyPhone   ?? null,
    },
  });
  res.status(201).json({ ninio });
}

// PUT /api/ninios/:id
export async function updateNinio(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const existing = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!existing) { res.status(404).json({ error: "Niño no encontrado" }); return; }

  const { fullName, weight, height, age, diagnosticos, rescueMed, rescueDose, alertMinutes, ambulanceMinutes, emergencyPhone } = req.body;
  const ninio = await prisma.ninio.update({
    where: { id },
    data: {
      ...(fullName && { fullName }),
      ...(weight != null && { weight: parseFloat(weight) }),
      ...(height != null && { height: parseFloat(height) }),
      ...(age != null && { age: parseInt(age) }),
      ...(diagnosticos != null && { diagnosticos: Array.isArray(diagnosticos) ? diagnosticos : [diagnosticos] }),
      ...(rescueMed        !== undefined && { rescueMed:        rescueMed        ?? null }),
      ...(rescueDose       !== undefined && { rescueDose:       rescueDose       ?? null }),
      ...(alertMinutes     !== undefined && { alertMinutes:     alertMinutes     != null ? parseInt(String(alertMinutes))     : null }),
      ...(ambulanceMinutes !== undefined && { ambulanceMinutes: ambulanceMinutes != null ? parseInt(String(ambulanceMinutes)) : null }),
      ...(emergencyPhone   !== undefined && { emergencyPhone:   emergencyPhone   ?? null }),
    },
  });
  res.json({ ninio });
}

// DELETE /api/ninios/:id
export async function deleteNinio(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const existing = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!existing) { res.status(404).json({ error: "Niño no encontrado" }); return; }

  await prisma.ninio.delete({ where: { id } });
  res.json({ ok: true });
}
