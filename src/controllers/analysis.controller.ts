import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";
import { runDoseEffectAnalysis, TrackerRecord, Medication } from "../lib/doseEffectAlgorithm";

async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// GET /api/patients/:id/medication-analysis
export async function getMedicationAnalysis(req: AuthRequest, res: Response) {
  const ninioId = req.params.id as string;

  const ninio = await ownedNinio(ninioId, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const [rawMeds, rawRecords] = await Promise.all([
    prisma.medicacion.findMany({ where: { ninioId }, orderBy: { createdAt: "asc" } }),
    prisma.tracker.findMany({
      where: { ninioId },
      orderBy: { date: "asc" },
      select: {
        date: true,
        sleep: true,
        wakeUps: true,
        sleepQuality: true,
        energy: true,
        hasCrisis: true,
        bowelCount: true,
        feedQuality: true,
        attention: true,
        hasBehaviorIssue: true,
        doseAltered: true,
        alteredMedId: true,
        actualDose: true,
        direccionAlteracion: true,
        alteraciones: true,
      },
    }),
  ]);

  const medications: Medication[] = rawMeds.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }));
  const records: TrackerRecord[] = rawRecords.map((r: typeof rawRecords[number]) => ({
    date:               r.date,
    sleep:              r.sleep,
    wakeUps:            r.wakeUps,
    sleepQuality:       r.sleepQuality,
    energy:             r.energy,
    hasCrisis:          r.hasCrisis,
    bowelCount:         r.bowelCount,
    feedQuality:        r.feedQuality,
    attention:          r.attention,
    hasBehaviorIssue:   r.hasBehaviorIssue,
    doseAltered:        r.doseAltered,
    alteredMedId:       r.alteredMedId,
    actualDose:         r.actualDose,
    direccionAlteracion: r.direccionAlteracion,
    alteraciones:       r.alteraciones,
  }));

  const findings = runDoseEffectAnalysis(records, medications);

  res.json({ findings, total_records: records.length, total_medications: medications.length });
}
