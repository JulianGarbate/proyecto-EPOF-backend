import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";
import { accessibleNinio } from "../lib/access";

// GET /api/records?patientId=&date=YYYY-MM-DD   → registro único
// GET /api/records?patientId=&limit=N            → historial
export async function getRecords(req: AuthRequest, res: Response) {
  const { patientId, date, limit } = req.query as Record<string, string>;
  if (!patientId) { res.status(400).json({ error: "patientId es requerido" }); return; }

  const ninio = await accessibleNinio(patientId, req.userId!, ["canSeeHistory", "canFillTracker"]);
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

// Lunes=0…Domingo=6, mismo criterio que "dias" en Medicacion y useMedReminder.
function weekdayOf(dateStr: string): number {
  const jsDay = new Date(dateStr + "T12:00:00").getDay(); // 0=Dom
  return jsDay === 0 ? 6 : jsDay - 1;
}

// Descuenta 1 unidad de stock por horario programado ese día, para cada
// medicamento que se tomó completo (no está en missedMedIds). Solo corre una
// vez por día — se llama exclusivamente cuando el registro se crea por primera vez.
async function deductStockForDay(ninioId: string, dateStr: string, tookAllMeds: boolean, missedMedIds: string[]) {
  if (!tookAllMeds) return;
  const dow = weekdayOf(dateStr);
  const meds = await prisma.medicacion.findMany({ where: { ninioId, stockQuantity: { not: null } } });
  for (const med of meds) {
    if (missedMedIds.includes(med.id)) continue;
    if (med.dias.length > 0 && !med.dias.includes(dow)) continue;
    const dosesToday = med.horarios ? med.horarios.split(",").map((h) => h.trim()).filter(Boolean).length : 0;
    if (dosesToday === 0) continue;
    const next = Math.max(0, (med.stockQuantity ?? 0) - dosesToday);
    await prisma.medicacion.update({ where: { id: med.id }, data: { stockQuantity: next } });
  }
}

// POST /api/records
export async function createRecord(req: AuthRequest, res: Response) {
  const { ninioId } = req.body;
  if (!ninioId) { res.status(400).json({ error: "ninioId es requerido" }); return; }

  const ninio = await accessibleNinio(ninioId, req.userId!, ["canFillTracker"]);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const { date, ...rest } = req.body;
  const dateStr: string = date ?? new Date().toISOString().split("T")[0];

  const existing = await prisma.tracker.findUnique({ where: { ninioId_date: { ninioId, date: dateStr } } });

  // Upsert: si ya existe para esa fecha lo actualiza
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (prisma.tracker.upsert as any)({
    where: { ninioId_date: { ninioId, date: dateStr } },
    create: { ninioId, date: dateStr, ...sanitize(rest) },
    update: { ...sanitize(rest) },
  });

  // Solo descontar stock la primera vez que se crea el registro del día —
  // evita descuentos duplicados si el usuario edita la jornada después.
  if (!existing) {
    await deductStockForDay(
      ninioId, dateStr,
      Boolean(rest.tookAllMeds),
      Array.isArray(rest.missedMedIds) ? rest.missedMedIds : []
    );
  }

  res.status(201).json({ record });
}

// GET /api/records/:id  — registro individual por id
export async function getRecordById(req: AuthRequest, res: Response) {
  const record = await prisma.tracker.findUnique({ where: { id: req.params.id as string } });
  if (!record) { res.status(404).json({ error: "Registro no encontrado" }); return; }

  const ninio = await accessibleNinio(record.ninioId, req.userId!, ["canSeeHistory", "canFillTracker"]);
  if (!ninio) { res.status(403).json({ error: "Sin permiso" }); return; }

  res.json({ record });
}

// GET /api/records/alterations?patientId=&medId=
// Todos los registros históricos donde se alteró esa medicación específica
export async function getAlterations(req: AuthRequest, res: Response) {
  const { patientId, medId } = req.query as Record<string, string>;
  if (!patientId || !medId) {
    res.status(400).json({ error: "patientId y medId son requeridos" });
    return;
  }

  const ninio = await accessibleNinio(patientId, req.userId!, ["canSeeMeds", "canSeeHistory"]);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const records = await prisma.tracker.findMany({
    where: { ninioId: patientId, doseAltered: true, alteredMedId: medId },
    orderBy: { date: "desc" },
  });
  res.json({ records });
}

// PUT /api/records/:id
export async function updateRecord(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const record = await prisma.tracker.findUnique({ where: { id } });
  if (!record) { res.status(404).json({ error: "Registro no encontrado" }); return; }

  const ninio = await accessibleNinio(record.ninioId, req.userId!, ["canFillTracker"]);
  if (!ninio) { res.status(403).json({ error: "Sin permiso" }); return; }

  const updated = await prisma.tracker.update({
    where: { id },
    data: sanitize(req.body),
  });
  res.json({ record: updated });
}

const ALLOWED_RECORD_FIELDS = new Set([
  "sleep", "wakeUps", "wakeUpTypes", "sleepQuality", "moods", "energy",
  "sleepStart", "sleepEnd", "naps",
  "hasCrisis", "crises", "crisisTypes", "otherType", "crisisSeverity",
  "requiredRescue", "requiredER", "startTime", "durationHrs", "durationMin",
  "durationSec", "triggers",
  "sleep", "sleepNote", "feedQuality", "hasRejection", "rejectedMeals", "rejectedItems", "managedToEat", "mealNote", "bowelCount", "bristolTypes",
  "tookAllMeds", "missedMedIds", "doseAltered", "alteredMedId", "actualDose",
  "direccionAlteracion", "efectosObservados", "alteraciones",
  "hadTherapy", "therapyTypes", "therapyDetail", "therapyNotes", "activities", "activitiesOther", "activitiesNote",
  "intercurrencias", "intercurrenciasNote",
  "attention", "attentionNote", "achievements", "achievementTime", "achievementSpontaneous", "achievementStimulus", "hydrationMl",
  "hasBehaviorIssue", "behaviorDetail", "regulation", "notes",
]);

function sanitize(body: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_RECORD_FIELDS.has(k))
  );
}
