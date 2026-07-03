// TEMPORARY — seed demo data. Remove after use.
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

const SEED_SECRET = process.env.SEED_SECRET ?? "epof-seed-2026";
const NINIO_ID    = "aa2ca26e-9c48-4dd2-9b03-87ed010bc15d";
// Known from first seed:
const MED_VALPROATO = "af704656-e73b-4466-be3a-8e138b40cf27";
// Fixed UUIDs for new meds — created by this endpoint:
const MED_LEVETI    = "22334455-6677-8899-aabb-ccddee001122";
const MED_CLONA     = "aabbccdd-eeff-0011-2233-445566778899";

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

function rec(date: string, overrides: Record<string, unknown> = {}) {
  return {
    ninioId:            NINIO_ID,
    date,
    sleep:              8.0,
    wakeUps:            1,
    sleepQuality:       "buena",
    energy:             "media",
    hasCrisis:          false,
    bowelCount:         2,
    feedQuality:        "buena",
    attention:          "media",
    hasBehaviorIssue:   false,
    doseAltered:        false,
    alteredMedId:       null,
    direccionAlteracion: null,
    alteraciones:       null,
    moods:              [],
    hasRejection:       false,
    crisisEntries:      [],
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

  // 1. Create new medications if they don't exist
  await prisma.medication.upsert({
    where:  { id: MED_LEVETI },
    update: {},
    create: {
      id:       MED_LEVETI,
      ninioId:  NINIO_ID,
      name:     "Levetiracetam",
      dose:     "500mg",
      horarios: "08:00,20:00",
      dias:     [0,1,2,3,4,5,6],
    },
  });
  await prisma.medication.upsert({
    where:  { id: MED_CLONA },
    update: {},
    create: {
      id:       MED_CLONA,
      ninioId:  NINIO_ID,
      name:     "Clonazepam",
      dose:     "0.5mg",
      horarios: "22:00",
      dias:     [0,1,2,3,4,5,6],
    },
  });

  const records: ReturnType<typeof rec>[] = [];

  // ── SCENARIO A: Levetiracetam SUBIDA → all BAD effects ─────────────────────
  // 3 events: sleep decreases, crises increase, behavior issues appear
  for (let ev = 0; ev < 3; ev++) {
    const eventDate = addDays("2025-10-15", ev * 25);
    // 7 baseline: sleep 8, no crisis, no behavior
    for (let i = 7; i >= 1; i--) records.push(rec(addDays(eventDate, -i), { sleep: 8, hasCrisis: false, hasBehaviorIssue: false, energy: "media" }));
    // event day
    records.push(altRec(eventDate, MED_LEVETI, "subida", { sleep: 8, hasCrisis: false }));
    // washout
    records.push(rec(addDays(eventDate, 1), { sleep: 7.5 }));
    // 7 effect days: sleep worse, crisis appear, behavior issues
    for (let i = 2; i <= 8; i++) {
      records.push(rec(addDays(eventDate, i), {
        sleep:            6.0,
        wakeUps:          4,
        sleepQuality:     "mala",
        energy:           "baja",
        hasCrisis:        true,
        hasBehaviorIssue: true,
        attention:        "baja",
      }));
    }
  }

  // ── SCENARIO B: Clonazepam BAJADA → mixed (2 bad, 1 good event) ───────────
  // Event 1 (bad): sleep decreases, crises increase
  const evB1 = "2025-10-20";
  for (let i = 7; i >= 1; i--) records.push(rec(addDays(evB1, -i), { sleep: 8, hasCrisis: false }));
  records.push(altRec(evB1, MED_CLONA, "bajada", { sleep: 8 }));
  records.push(rec(addDays(evB1, 1), { sleep: 7.5 }));
  for (let i = 2; i <= 8; i++) records.push(rec(addDays(evB1, i), { sleep: 6.0, wakeUps: 3, hasCrisis: true, energy: "baja" }));

  // Event 2 (bad): sleep decreases again
  const evB2 = addDays(evB1, 28);
  for (let i = 7; i >= 1; i--) records.push(rec(addDays(evB2, -i), { sleep: 8, hasCrisis: false }));
  records.push(altRec(evB2, MED_CLONA, "bajada", { sleep: 8 }));
  records.push(rec(addDays(evB2, 1), { sleep: 7.5 }));
  for (let i = 2; i <= 8; i++) records.push(rec(addDays(evB2, i), { sleep: 5.5, wakeUps: 4, hasCrisis: true, energy: "baja" }));

  // Event 3 (good): sleep improves — inconsistent result
  const evB3 = addDays(evB1, 56);
  for (let i = 7; i >= 1; i--) records.push(rec(addDays(evB3, -i), { sleep: 8, hasCrisis: false }));
  records.push(altRec(evB3, MED_CLONA, "bajada", { sleep: 8 }));
  records.push(rec(addDays(evB3, 1), { sleep: 8.5 }));
  for (let i = 2; i <= 8; i++) records.push(rec(addDays(evB3, i), { sleep: 9.0, wakeUps: 0, hasCrisis: false, energy: "alta" }));

  // 2. Bulk insert all records, skip conflicts
  let inserted = 0;
  for (const r of records) {
    try {
      await (prisma.tracker as unknown as { create: (args: { data: typeof r }) => Promise<unknown> }).create({ data: r });
      inserted++;
    } catch {
      // skip duplicates
    }
  }

  res.json({ ok: true, inserted, total: records.length, meds: { MED_LEVETI, MED_CLONA } });
});

export default router;
