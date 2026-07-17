import { Request, Response } from "express";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

// GET /api/share/:ninioId  — devuelve el shareToken existente (requiere auth)
export async function getShareToken(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }
  res.json({ shareToken: ninio.shareToken ?? null });
}

// POST /api/share/:ninioId  — genera o regenera el shareToken (requiere auth)
export async function generateShareToken(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const shareToken = randomUUID();
  await prisma.ninio.update({ where: { id }, data: { shareToken } });
  res.json({ shareToken });
}

// DELETE /api/share/:ninioId  — revoca el token (requiere auth)
export async function revokeShareToken(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  await prisma.ninio.update({ where: { id }, data: { shareToken: null } });
  res.json({ ok: true });
}

// GET /api/public/share/:token  — vista pública SIN auth
export async function getPublicShare(req: Request, res: Response) {
  const token = req.params.token as string;
  const ninio = await prisma.ninio.findUnique({ where: { shareToken: token } });
  if (!ninio) { res.status(404).json({ error: "Enlace no válido o revocado" }); return; }

  const [records, medications, consultas] = await Promise.all([
    prisma.tracker.findMany({
      where: { ninioId: ninio.id },
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.medicacion.findMany({ where: { ninioId: ninio.id }, orderBy: { createdAt: "asc" } }),
    prisma.consulta.findMany({ where: { ninioId: ninio.id }, orderBy: { date: "desc" }, take: 10 }),
  ]);

  res.json({
    ninio: {
      fullName: ninio.fullName,
      age: ninio.age,
      weight: ninio.weight,
      height: ninio.height,
      diagnosticos: ninio.diagnosticos,
    },
    records,
    medications,
    consultas,
  });
}

// GET /api/share/:ninioId/emergency  — devuelve el emergencyToken existente (requiere auth)
export async function getEmergencyToken(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }
  res.json({ emergencyToken: ninio.emergencyToken ?? null });
}

// POST /api/share/:ninioId/emergency  — genera o regenera el emergencyToken (requiere auth)
export async function generateEmergencyToken(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const emergencyToken = randomUUID();
  await prisma.ninio.update({ where: { id }, data: { emergencyToken } });
  res.json({ emergencyToken });
}

// DELETE /api/share/:ninioId/emergency  — revoca el emergencyToken (requiere auth)
export async function revokeEmergencyToken(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await prisma.ninio.findFirst({ where: { id, userId: req.userId } });
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  await prisma.ninio.update({ where: { id }, data: { emergencyToken: null } });
  res.json({ ok: true });
}

// GET /api/share/emergency/:token  — ficha de emergencia pública SIN auth (para paramédicos vía QR/link)
export async function getPublicEmergencyCard(req: Request, res: Response) {
  const token = req.params.token as string;
  const ninio = await prisma.ninio.findUnique({ where: { emergencyToken: token } });
  if (!ninio) { res.status(404).json({ error: "Enlace no válido o revocado" }); return; }

  res.json({
    ninio: {
      fullName: ninio.fullName,
      age: ninio.age,
      weight: ninio.weight,
      diagnosticos: ninio.diagnosticos,
      allergies: ninio.allergies,
      coberturaMedica: ninio.coberturaMedica,
      nroAsociado: ninio.nroAsociado,
      rescueMed: ninio.rescueMed,
      rescueDose: ninio.rescueDose,
      doctorName: ninio.doctorName,
      doctorPhone: ninio.doctorPhone,
      doctorSpecialty: ninio.doctorSpecialty,
      emergencyPhone: ninio.emergencyPhone,
    },
  });
}
