// TEMPORARY — seed demo data. Remove after use.
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router  = Router();
const prisma  = new PrismaClient();

const SEED_SECRET = process.env.SEED_SECRET ?? "epof-seed-2026";
const NINIO_ID    = "aa2ca26e-9c48-4dd2-9b03-87ed010bc15d";
const MED_GOOD    = "bbccddee-ff00-1122-3344-556677889900"; // Clobazam — all positive
const MED_LEVETI  = "22334455-6677-8899-aabb-ccddee001122"; // Levetiracetam — all negative
const MED_CLONA   = "aabbccdd-eeff-0011-2233-445566778899"; // Clonazepam — mixed

function addDays(base: string, n: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

function baseline(date: string, overrides: Record<string, unknown> = {}) {
  return {
    ninioId: NINIO_ID, date,
    sleep: 8.0, wakeUps: 1, sleepQuality: "buena", energy: "media",
    hasCrisis: false, crisisTypes: [] as string[], bowelCount: 2,
    feedQuality: "buena", hasRejection: false,
    rejectedMeals: [] as string[], bristolTypes: [] as string[],
    tookAllMeds: true, missedMedIds: [] as string[],
    doseAltered: false, alteredMedId: null as string | null,
    direccionAlteracion: null as string | null, alteraciones: null,
    hadTherapy: false, attention: "media",
    hasBehaviorIssue: false, efectosObservados: [] as string[],
    moods: [] as string[],
    ...overrides,
  };
}

function eventRec(date: string, medId: string, dir: string) {
  return baseline(date, {
    doseAltered: true, alteredMedId: medId,
    direccionAlteracion: dir,
    alteraciones: [{ medId, dosis: "500mg", direccion: dir }],
  });
}

// 7 baseline + event + 8 outcome = 16 records per block
function block(
  eventDate: string,
  medId: string,
  dir: string,
  afterOverrides: Record<string, unknown>,
): object[] {
  const recs: object[] = [];
  for (let i = 7; i >= 1; i--) recs.push(baseline(addDays(eventDate, -i)));
  recs.push(eventRec(eventDate, medId, dir));
  for (let i = 1; i <= 8; i++) recs.push(baseline(addDays(eventDate, i), afterOverrides));
  return recs;
}

// Clobazam: 3 events, all GOOD outcomes (subida) → pure positive card
const GOOD_EVENTS  = ["2020-01-15", "2020-02-24", "2020-04-05"];
const GOOD_OUTCOME = {
  sleep: 9.0, wakeUps: 0, sleepQuality: "buena", energy: "alta",
  hasCrisis: false, hasBehaviorIssue: false, attention: "alta",
};

// Levetiracetam: 3 events, all BAD outcomes (subida) → pure negative card
const LEV_EVENTS  = ["2020-05-15", "2020-06-24", "2020-08-03"];
const BAD_OUTCOME = {
  sleep: 5.5, wakeUps: 5, sleepQuality: "mala", energy: "baja",
  hasCrisis: true, hasBehaviorIssue: true, attention: "baja",
};

// Clonazepam: 3 events, MIXED outcomes (bajada):
// sleep/energy/attention improve consistently → beneficio
// hasCrisis worsens consistently → consecuencia
// Both types appear on the same card.
const CLO_EVENTS  = ["2020-09-10", "2020-10-20", "2020-11-30"];
const CLO_OUTCOME = {
  sleep: 9.5, wakeUps: 0, sleepQuality: "buena", energy: "alta",
  hasCrisis: true, hasBehaviorIssue: false, attention: "alta",
};

router.get("/run", async (req: Request, res: Response): Promise<void> => {
  if (req.query["s"] !== SEED_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Cleanup previous seed data (2020 dates, safe — user data is from 2026)
  const deleted = await prisma.tracker.deleteMany({
    where: { ninioId: NINIO_ID, date: { gte: "2019-01-01", lte: "2021-12-31" } },
  });
  await prisma.medicacion.deleteMany({
    where: { id: { in: [MED_GOOD, MED_LEVETI, MED_CLONA] } },
  });

  // Create medications
  await prisma.medicacion.create({
    data: { id: MED_GOOD, ninioId: NINIO_ID, name: "Clobazam", dose: "10mg", horarios: "22:00", dias: [0,1,2,3,4,5,6] },
  });
  await prisma.medicacion.create({
    data: { id: MED_LEVETI, ninioId: NINIO_ID, name: "Levetiracetam", dose: "500mg", horarios: "08:00,20:00", dias: [0,1,2,3,4,5,6] },
  });
  await prisma.medicacion.create({
    data: { id: MED_CLONA, ninioId: NINIO_ID, name: "Clonazepam", dose: "0.5mg", horarios: "22:00", dias: [0,1,2,3,4,5,6] },
  });

  // Build all tracker records
  const records: object[] = [
    ...GOOD_EVENTS.flatMap((d) => block(d, MED_GOOD,   "subida", GOOD_OUTCOME)),
    ...LEV_EVENTS.flatMap((d)  => block(d, MED_LEVETI, "subida", BAD_OUTCOME)),
    ...CLO_EVENTS.flatMap((d)  => block(d, MED_CLONA,  "bajada", CLO_OUTCOME)),
  ];

  // Insert — skip duplicates
  let inserted = 0;
  const skipped: string[] = [];
  for (const r of records) {
    try {
      await (prisma.tracker as typeof prisma.tracker).create({ data: r as never });
      inserted++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Unique constraint")) {
        skipped.push((r as { date: string }).date);
      } else {
        res.status(500).json({ error: msg, record: r });
        return;
      }
    }
  }

  res.json({
    ok: true,
    deleted: deleted.count,
    inserted,
    skipped: skipped.length,
    skippedDates: skipped,
    total: records.length,
    meds: { MED_GOOD, MED_LEVETI, MED_CLONA },
  });
});

export default router;
