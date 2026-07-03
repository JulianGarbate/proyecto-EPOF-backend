// TEMPORARY — seed demo data. Remove after use.
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router  = Router();
const prisma  = new PrismaClient();

const SEED_SECRET = process.env.SEED_SECRET ?? "epof-seed-2026";
const NINIO_ID    = "aa2ca26e-9c48-4dd2-9b03-87ed010bc15d";
const MED_LEVETI  = "22334455-6677-8899-aabb-ccddee001122";
const MED_CLONA   = "aabbccdd-eeff-0011-2233-445566778899";

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

// Build a block: 7 baseline days + event day + 8 outcome days, returns 16 records
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

// Levetiracetam: 3 events all with bad outcomes
// Dates in 2020-01 / 2020-02 / 2020-03 — 40 days apart, windows (7+1+8=16) don't overlap
const LEV_EVENTS  = ["2020-01-15", "2020-02-24", "2020-04-05"];
const BAD_OUTCOME = { sleep: 5.5, wakeUps: 5, sleepQuality: "mala", energy: "baja", hasCrisis: true, hasBehaviorIssue: true, attention: "baja" };

// Clonazepam: 3 events in May/Jun/Jul 2020 (>2 months after last Levetiracetam window, no overlap)
// 2 bad + 1 good, direction "bajada"
const CLO_EVENTS   = ["2020-05-15", "2020-06-24", "2020-08-03"];
const CLO_OUTCOMES = [
  { sleep: 5.0, wakeUps: 6, sleepQuality: "mala",     energy: "baja",  hasCrisis: true,  hasBehaviorIssue: true,  attention: "baja" },
  { sleep: 5.5, wakeUps: 4, sleepQuality: "mala",     energy: "baja",  hasCrisis: true,  hasBehaviorIssue: false, attention: "baja" },
  { sleep: 8.5, wakeUps: 0, sleepQuality: "muy buena", energy: "alta", hasCrisis: false, hasBehaviorIssue: false, attention: "alta" },
];

router.get("/run", async (req: Request, res: Response): Promise<void> => {
  if (req.query["s"] !== SEED_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Upsert medications
  await prisma.medicacion.upsert({
    where:  { id: MED_LEVETI },
    update: {},
    create: { id: MED_LEVETI, ninioId: NINIO_ID, name: "Levetiracetam", dose: "500mg", horarios: "08:00,20:00", dias: [0,1,2,3,4,5,6] },
  });
  await prisma.medicacion.upsert({
    where:  { id: MED_CLONA },
    update: {},
    create: { id: MED_CLONA, ninioId: NINIO_ID, name: "Clonazepam", dose: "0.5mg", horarios: "22:00", dias: [0,1,2,3,4,5,6] },
  });

  // Build all tracker records
  const records: object[] = [
    ...LEV_EVENTS.flatMap((d) => block(d, MED_LEVETI, "subida", BAD_OUTCOME)),
    ...CLO_EVENTS.map((d, i)  => block(d, MED_CLONA,  "bajada", CLO_OUTCOMES[i])).flat(),
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
        // Real error — surface it
        res.status(500).json({ error: msg, record: r });
        return;
      }
    }
  }

  res.json({
    ok: true,
    inserted,
    skipped: skipped.length,
    skippedDates: skipped,
    total: records.length,
    meds: { MED_LEVETI, MED_CLONA },
  });
});

export default router;
