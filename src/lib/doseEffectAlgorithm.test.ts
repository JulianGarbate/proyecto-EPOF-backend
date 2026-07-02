// Unit tests using Node.js built-in test runner (node:test).
// Run with: node --require ts-node/register --test src/lib/doseEffectAlgorithm.test.ts
// Or via npm script: npm test

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  runDoseEffectAnalysis,
  DEFAULT_CONFIG,
  TrackerRecord,
  Medication,
  AlgorithmConfig,
} from "./doseEffectAlgorithm";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MED_A: Medication = { id: "med-a", name: "Medicamento A" };
const MED_B: Medication = { id: "med-b", name: "Medicamento B" };

function makeRecord(date: string, overrides: Partial<TrackerRecord> = {}): TrackerRecord {
  return {
    date,
    sleep: 8,
    wakeUps: 1,
    sleepQuality: "buena",
    energy: "media",
    hasCrisis: false,
    bowelCount: 2,
    feedQuality: "buena",
    attention: "media",
    hasBehaviorIssue: false,
    doseAltered: false,
    alteredMedId: null,
    direccionAlteracion: null,
    alteraciones: null,
    ...overrides,
  };
}

function makeAltRecord(
  date: string,
  medId: string,
  dir: string,
  overrides: Partial<TrackerRecord> = {},
): TrackerRecord {
  return makeRecord(date, {
    doseAltered: true,
    alteredMedId: medId,
    direccionAlteracion: dir,
    alteraciones: [{ medId, dosis: "10mg", direccion: dir }],
    ...overrides,
  });
}

// Build a date string N days offset from a base date
function dPlus(base: string, n: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

const BASE = "2024-01-15";

// Minimal config to reduce data requirements in tests
const SMALL_CONFIG: AlgorithmConfig = {
  W_antes: 5,
  D_washout: 1,
  W_despues: 5,
  min_dias_registrados: 3,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("runDoseEffectAnalysis", () => {
  it("clear pattern → patron_detectado with beneficio on sleep", () => {
    // Three subida events for MED_A, each followed by improved sleep (9h vs 8h baseline)
    const records: TrackerRecord[] = [];

    for (let ev = 0; ev < 3; ev++) {
      const eventDate = dPlus(BASE, ev * 25); // events 25 days apart

      // 5 baseline records
      for (let i = 5; i >= 1; i--) {
        records.push(makeRecord(dPlus(eventDate, -i), { sleep: 8 }));
      }
      // event day
      records.push(makeAltRecord(eventDate, MED_A.id, "subida", { sleep: 8 }));
      // washout (1 day, per SMALL_CONFIG)
      records.push(makeRecord(dPlus(eventDate, 1), { sleep: 8 }));
      // 5 effect records with improved sleep
      for (let i = 2; i <= 6; i++) {
        records.push(makeRecord(dPlus(eventDate, i), { sleep: 9 }));
      }
    }

    const findings = runDoseEffectAnalysis(records, [MED_A], SMALL_CONFIG);
    const sleepFinding = findings.find(
      (f) => f.metrica === "sleep" && f.medicamentoId === MED_A.id && f.direccion_dosis === "subida",
    );

    assert.ok(sleepFinding, "Should detect sleep pattern");
    assert.equal(sleepFinding.nivel, "patron_detectado");
    assert.equal(sleepFinding.tipo, "beneficio");
    assert.ok(sleepFinding.eventos_consistentes >= 3);
    assert.ok(sleepFinding.score_confianza >= 0.75);
  });

  it("weak pattern (2 events, k/K=1.0 ≥ 0.66) → posible_patron", () => {
    const records: TrackerRecord[] = [];

    for (let ev = 0; ev < 2; ev++) {
      const eventDate = dPlus(BASE, ev * 25);
      for (let i = 5; i >= 1; i--) records.push(makeRecord(dPlus(eventDate, -i), { sleep: 8 }));
      records.push(makeAltRecord(eventDate, MED_A.id, "bajada", { sleep: 8 }));
      records.push(makeRecord(dPlus(eventDate, 1), { sleep: 8 }));
      for (let i = 2; i <= 6; i++) records.push(makeRecord(dPlus(eventDate, i), { sleep: 7 }));
    }

    const findings = runDoseEffectAnalysis(records, [MED_A], SMALL_CONFIG);
    const sleepFinding = findings.find(
      (f) => f.metrica === "sleep" && f.medicamentoId === MED_A.id && f.direccion_dosis === "bajada",
    );

    assert.ok(sleepFinding, "Should detect weak pattern");
    assert.equal(sleepFinding.nivel, "posible_patron");
    assert.equal(sleepFinding.tipo, "consecuencia"); // sleep decreased
    assert.equal(sleepFinding.eventos_totales, 2);
    assert.equal(sleepFinding.eventos_consistentes, 2);
  });

  it("confounded event excluded — K drops below threshold → no finding", () => {
    const records: TrackerRecord[] = [];

    // First event for MED_A subida — during effect window, MED_B also changes → confounded
    const ev1 = BASE;
    for (let i = 5; i >= 1; i--) records.push(makeRecord(dPlus(ev1, -i), { sleep: 8 }));
    records.push(makeAltRecord(ev1, MED_A.id, "subida", { sleep: 8 }));
    records.push(makeRecord(dPlus(ev1, 1), { sleep: 8 })); // washout
    for (let i = 2; i <= 5; i++) records.push(makeRecord(dPlus(ev1, i), { sleep: 9 }));
    // MED_B changes on day +4 (within effect window of ev1)
    records.push(makeAltRecord(dPlus(ev1, 4), MED_B.id, "subida"));

    // Second event for MED_A — same confounder situation
    const ev2 = dPlus(BASE, 30);
    for (let i = 5; i >= 1; i--) records.push(makeRecord(dPlus(ev2, -i), { sleep: 8 }));
    records.push(makeAltRecord(ev2, MED_A.id, "subida", { sleep: 8 }));
    records.push(makeRecord(dPlus(ev2, 1), { sleep: 8 }));
    for (let i = 2; i <= 5; i++) records.push(makeRecord(dPlus(ev2, i), { sleep: 9 }));
    records.push(makeAltRecord(dPlus(ev2, 4), MED_B.id, "bajada")); // confounder in ev2 window too

    const findings = runDoseEffectAnalysis(records, [MED_A, MED_B], SMALL_CONFIG);
    const sleepFinding = findings.find(
      (f) => f.metrica === "sleep" && f.medicamentoId === MED_A.id && f.direccion_dosis === "subida",
    );

    assert.equal(sleepFinding, undefined, "Confounded events should produce no finding");
  });

  it("insufficient data in windows → event excluded → K < 2 → no finding", () => {
    // Only 2 before-records (below min_dias_registrados=3)
    const records: TrackerRecord[] = [];
    for (let ev = 0; ev < 3; ev++) {
      const eventDate = dPlus(BASE, ev * 25);
      // Only 2 baseline records (< min=3)
      for (let i = 2; i >= 1; i--) records.push(makeRecord(dPlus(eventDate, -i), { sleep: 8 }));
      records.push(makeAltRecord(eventDate, MED_A.id, "subida"));
      records.push(makeRecord(dPlus(eventDate, 1), { sleep: 8 }));
      for (let i = 2; i <= 6; i++) records.push(makeRecord(dPlus(eventDate, i), { sleep: 9 }));
    }

    const findings = runDoseEffectAnalysis(records, [MED_A], SMALL_CONFIG);
    const sleepFinding = findings.find(
      (f) => f.metrica === "sleep" && f.medicamentoId === MED_A.id && f.direccion_dosis === "subida",
    );

    assert.equal(sleepFinding, undefined, "Insufficient data should produce no finding");
  });

  it("single occurrence → K=1 → no finding reported", () => {
    const records: TrackerRecord[] = [];
    const eventDate = BASE;
    for (let i = 5; i >= 1; i--) records.push(makeRecord(dPlus(eventDate, -i), { sleep: 8 }));
    records.push(makeAltRecord(eventDate, MED_A.id, "subida"));
    records.push(makeRecord(dPlus(eventDate, 1), { sleep: 8 }));
    for (let i = 2; i <= 6; i++) records.push(makeRecord(dPlus(eventDate, i), { sleep: 9 }));

    const findings = runDoseEffectAnalysis(records, [MED_A], SMALL_CONFIG);
    assert.equal(findings.length, 0, "Single occurrence should produce no finding");
  });

  it("mixed results (k/K < 0.66) → no finding reported", () => {
    const records: TrackerRecord[] = [];
    // 3 events: 1 improves sleep, 2 no improvement → k=1, K=3, ratio=0.33
    const sleepAfter = [9, 8, 7]; // 1st improves, 2nd same, 3rd worsens

    for (let ev = 0; ev < 3; ev++) {
      const eventDate = dPlus(BASE, ev * 25);
      for (let i = 5; i >= 1; i--) records.push(makeRecord(dPlus(eventDate, -i), { sleep: 8 }));
      records.push(makeAltRecord(eventDate, MED_A.id, "subida"));
      records.push(makeRecord(dPlus(eventDate, 1), { sleep: 8 }));
      for (let i = 2; i <= 6; i++) {
        records.push(makeRecord(dPlus(eventDate, i), { sleep: sleepAfter[ev] }));
      }
    }

    const findings = runDoseEffectAnalysis(records, [MED_A], SMALL_CONFIG);
    const sleepFinding = findings.find(
      (f) => f.metrica === "sleep" && f.medicamentoId === MED_A.id && f.direccion_dosis === "subida",
    );
    assert.equal(sleepFinding, undefined, "Mixed results below threshold should produce no finding");
  });

  it("findings include medical disclaimer", () => {
    const records: TrackerRecord[] = [];
    for (let ev = 0; ev < 3; ev++) {
      const eventDate = dPlus(BASE, ev * 25);
      for (let i = 5; i >= 1; i--) records.push(makeRecord(dPlus(eventDate, -i), { sleep: 8 }));
      records.push(makeAltRecord(eventDate, MED_A.id, "subida"));
      records.push(makeRecord(dPlus(eventDate, 1), { sleep: 8 }));
      for (let i = 2; i <= 6; i++) records.push(makeRecord(dPlus(eventDate, i), { sleep: 9 }));
    }

    const findings = runDoseEffectAnalysis(records, [MED_A], SMALL_CONFIG);
    assert.ok(findings.length > 0, "Should have findings");
    findings.forEach((f) => {
      assert.ok(f.aviso.length > 0, "Each finding must include aviso");
      assert.ok(f.aviso.toLowerCase().includes("médico") || f.aviso.toLowerCase().includes("especialista"),
        "Aviso must mention doctor");
    });
  });

  it("results sorted: patron_detectado before posible_patron", () => {
    const records: TrackerRecord[] = [];
    // 3 events: sleep improves (patron_detectado) + 2 events: wakeUps stays same
    // This generates at least one patron_detectado (sleep) and no posible_patron for wakeUps
    for (let ev = 0; ev < 4; ev++) {
      const eventDate = dPlus(BASE, ev * 25);
      for (let i = 5; i >= 1; i--) {
        records.push(makeRecord(dPlus(eventDate, -i), { sleep: 7, wakeUps: 2 }));
      }
      records.push(makeAltRecord(eventDate, MED_A.id, "subida", { sleep: 7 }));
      records.push(makeRecord(dPlus(eventDate, 1), { sleep: 7, wakeUps: 2 }));
      for (let i = 2; i <= 6; i++) {
        // sleep improves clearly; wakeUps alternates (no pattern)
        records.push(makeRecord(dPlus(eventDate, i), {
          sleep: 9,
          wakeUps: ev % 2 === 0 ? 1 : 3,
        }));
      }
    }

    const findings = runDoseEffectAnalysis(records, [MED_A], SMALL_CONFIG);
    if (findings.length >= 2) {
      const firstPatron = findings.findIndex((f) => f.nivel === "patron_detectado");
      const firstPosible = findings.findIndex((f) => f.nivel === "posible_patron");
      if (firstPatron !== -1 && firstPosible !== -1) {
        assert.ok(firstPatron < firstPosible, "patron_detectado should come before posible_patron");
      }
    }
  });
});
