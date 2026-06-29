import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// GET /api/records?patientId=&date=YYYY-MM-DD   → registro único
// GET /api/records?patientId=&limit=N            → historial
export async function getRecords(req: AuthRequest, res: Response) {
  const { patientId, date, limit } = req.query as Record<string, string>;
  if (!patientId) { res.status(400).json({ error: "patientId es requerido" }); return; }

  const ninio = await ownedNinio(patientId, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  if (date) {
    const record = await prisma.tracker.findUnique({
      where: { ninioId_date: { ninioId: patientId, date } },
    });
    res.json({ record: record ?? null });
    return;
  }

  const take = limit ? Math.min(parseInt(limit), 100) : 30;
  const records = await prisma.tracker.findMany({
    where: { ninioId: patientId },
    orderBy: { date: "desc" },
    take,
  });
  res.json({ records });
}

// POST /api/records
export async function createRecord(req: AuthRequest, res: Response) {
  const { ninioId } = req.body;
  if (!ninioId) { res.status(400).json({ error: "ninioId es requerido" }); return; }

  const ninio = await ownedNinio(ninioId, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const { date, ...rest } = req.body;
  const dateStr: string = date ?? new Date().toISOString().split("T")[0];

  // Upsert: si ya existe para esa fecha lo actualiza
  const record = await prisma.tracker.upsert({
    where: { ninioId_date: { ninioId, date: dateStr } },
    create: { ninioId, date: dateStr, ...sanitize(rest) },
    update: { ...sanitize(rest) },
  });
  res.status(201).json({ record });
}

// PUT /api/records/:id
export async function updateRecord(req: AuthRequest, res: Response) {
  const record = await prisma.tracker.findUnique({ where: { id: req.params.id } });
  if (!record) { res.status(404).json({ error: "Registro no encontrado" }); return; }

  const ninio = await ownedNinio(record.ninioId, req.userId!);
  if (!ninio) { res.status(403).json({ error: "Sin permiso" }); return; }

  const updated = await prisma.tracker.update({
    where: { id: req.params.id },
    data: sanitize(req.body),
  });
  res.json({ record: updated });
}

// Limpia campos que no deben venir del body
function sanitize(body: Record<string, unknown>) {
  const { id, ninioId, createdAt, date, ...rest } = body;
  void id; void ninioId; void createdAt; void date;
  return rest;
}
