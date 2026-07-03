// TEMPORARY — seed demo data. Remove after use.
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

const SEED_SECRET = process.env.SEED_SECRET ?? "epof-seed-2026";
const NINIO_ID    = "aa2ca26e-9c48-4dd2-9b03-87ed010bc15d";
const MED_LEVETI  = "22334455-6677-8899-aabb-ccddee001122";
const MED_CLONA   = "aabbccdd-eeff-0011-2233-445566778899";

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

function rec(date: string, overrides: Record<string, unknown> = {}) {
  return {
    ninioId:             NINIO_ID,
    date,
    sleep:               8.0,
    wakeUps:             1,
    sleepQuality:        "buena",
    energy:              "media",
    hasCrisis:           false,
    crisisTypes:         [] as string[],
    bowelCount:          2,
    feedQuality:         "buena",
    hasRejection:        false,
    rejectedMeals:       [] as string[],
    bristolTypes:        [] as string[],
    tookAllMeds:         true,
    missedMedIds:        [] as string[],
    doseAltered:         false,
    alteredMedId:        null as string | null,
    direccionAlteracion: null as string | null,
    alteraciones:        null,
    hadTherapy:          false,
    attention:           "media",
    hasBehaviorIssue:    false,
    efectosObservados:   [] as string[],
    moods:               [] as string[],
    ...overrides,
  };
}

function altRec(date: string, medId: string, dir: string, overrides: Record<string, unknown> = {}) {
  return rec(date, {
    doseAltered:         true,
    alteredMedId:        medId,
    direccionAlteracion: dir,
    alteraciones:        [{ medId, dosis: "500mg", direccion: dir }],
    ...overrides,
  });
}

router.get("/run", async (req: Request, res: Response): Promise<void> => {
  if (req.query["s"] !== SEED_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // 1. Upsert medications
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

  // 2. Build tracker records
  const records: ReturnType<typeof rec>[] = [];

  // Scenario A: Levetiracetam SUBIDA → all BAD (3 events)
  for (let ev = 0; ev < 3; ev++) {
    const eventDate = addDays("2025-10-15", ev * 25);
    for (let i = 7; i >= 1; i--) {
      records.push(rec(addDays(eventDate, -i), { sleep: 8, hasCrisis: false, hasBehaviorIssue: false, energy: "media" }));
    }
    records.push(altRec(eventDate, MED_LEVETI, "subida", { sleep: 8, hasCrisis: false }));
    for (let i = 1; i <= 8; i++) {
      records.push(rec(addDays(eventDate, i), { sleep: 6.0, wakeUps: 4, sleepQuality: "mala", energy: "baja", hasCrisis: true, hasBehaviorIssue: true, attention: "baja" }));
    }
  }

  // Scenario B: Clonazepam BAJADA → mixed (2 bad + 1 good)
  const evDates = ["2025-10-20", "2025-11-20", "2025-12-20"];
  const outcomes = [
    { sleep: 5.5, wakeUps: 5, sleepQuality: "mala", energy: "baja", hasCrisis: true, hasBehaviorIssue: true, attention: "baja" },
    { sleep: 5.0, wakeUps: 6, sleepQuality: "mala", energy: "baja", hasCrisis: true, hasBehaviorIssue: true, attention: "baja" },
    { sleep: 8.5, wakeUps: 0, sleepQuality: "muy buena", energy: "alta", hasCrisis: false, hasBehaviorIssue: false, attention: "alta" },
  ];

  for (let ev = 0; ev < 3; ev++) {
    const eventDate = evDates[ev];
    for (let i = 7; i >= 1; i--) {
      records.push(rec(addDays(eventDate, -i), { sleep: 8, hasCrisis: false, hasBehaviorIssue: false, energy: "media" }));
    }
    records.push(altRec(eventDate, MED_CLONA, "bajada", { sleep: 8, hasCrisis: false }));
    for (let i = 1; i <= 8; i++) {
      records.push(rec(addDays(eventDate, i), outcomes[ev]));
    }
  }

  // 3. Insert records (skip duplicates)
  let inserted = 0;
  for (const r of records) {
    try {
      await (prisma.tracker as Parameters<typeof prisma.tracker.create>[0] extends never ? never : typeof prisma.tracker).create({ data: r as never });
      inserted++;
    } catch { /* skip duplicates */ }
  }

  res.json({ ok: true, inserted, total: records.length });
});

export default router;
