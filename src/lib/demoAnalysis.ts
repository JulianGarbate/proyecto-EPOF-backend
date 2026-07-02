// Demo script: runs the algorithm with realistic sample data and prints findings.
// Usage: npx ts-node src/lib/demoAnalysis.ts

import { runDoseEffectAnalysis, TrackerRecord, Medication, DEFAULT_CONFIG } from "./doseEffectAlgorithm";

const MED_VALPROATO: Medication  = { id: "med-1", name: "Valproato de Sodio" };
const MED_LEVETIRACETAM: Medication = { id: "med-2", name: "Levetiracetam" };

// Helper
function d(base: string, n: number): string {
  const dt = new Date(base + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().split("T")[0];
}

function rec(date: string, overrides: Partial<TrackerRecord> = {}): TrackerRecord {
  return {
    date,
    sleep: 8, wakeUps: 1, sleepQuality: "regular",
    energy: "media", hasCrisis: false, bowelCount: 2,
    feedQuality: "buena", attention: "media", hasBehaviorIssue: false,
    doseAltered: false, alteredMedId: null, direccionAlteracion: null,
    alteraciones: null,
    ...overrides,
  };
}

const records: TrackerRecord[] = [];
const BASE = "2024-03-01";

// ── 3 subidas de Valproato ──────────────────────────────────────────────────
// Patrón claro: después de subir la dosis → menos crisis (beneficio) + más sueño
for (let ev = 0; ev < 3; ev++) {
  const eDate = d(BASE, ev * 30);

  // 10 días antes: sueño regular, alguna crisis
  for (let i = 10; i >= 1; i--) {
    records.push(rec(d(eDate, -i), {
      sleep: 7.5,
      wakeUps: 2,
      hasCrisis: i % 3 === 0,   // crisis each 3rd day
      energy: "baja",
      attention: "baja",
    }));
  }

  // Día de la subida
  records.push(rec(eDate, {
    doseAltered: true,
    alteredMedId: MED_VALPROATO.id,
    direccionAlteracion: "subida",
    alteraciones: [{ medId: MED_VALPROATO.id, dosis: "600mg", direccion: "subida" }],
    hasCrisis: true,
  }));

  // 3 días washout
  for (let i = 1; i <= 3; i++) {
    records.push(rec(d(eDate, i), { sleep: 7, hasCrisis: i === 1 }));
  }

  // 10 días efecto: más sueño, sin crisis, mejor energía
  for (let i = 4; i <= 13; i++) {
    records.push(rec(d(eDate, i), {
      sleep: 9.2,
      wakeUps: 0,
      hasCrisis: false,
      energy: "alta",
      attention: "alta",
    }));
  }
}

// ── 2 bajadas de Levetiracetam ──────────────────────────────────────────────
// Patrón: bajar la dosis → irritabilidad y problemas de conducta (consecuencia)
const LEV_BASE = d(BASE, 100);
for (let ev = 0; ev < 2; ev++) {
  const eDate = d(LEV_BASE, ev * 35);

  for (let i = 10; i >= 1; i--) {
    records.push(rec(d(eDate, -i), { hasBehaviorIssue: false, energy: "media" }));
  }

  records.push(rec(eDate, {
    doseAltered: true,
    alteredMedId: MED_LEVETIRACETAM.id,
    direccionAlteracion: "bajada",
    alteraciones: [{ medId: MED_LEVETIRACETAM.id, dosis: "250mg", direccion: "bajada" }],
  }));

  for (let i = 1; i <= 3; i++) {
    records.push(rec(d(eDate, i)));
  }

  for (let i = 4; i <= 13; i++) {
    records.push(rec(d(eDate, i), { hasBehaviorIssue: true, energy: "baja" }));
  }
}

// ── Ejecutar algoritmo ──────────────────────────────────────────────────────
const findings = runDoseEffectAnalysis(
  records,
  [MED_VALPROATO, MED_LEVETIRACETAM],
  DEFAULT_CONFIG,
);

console.log(`\n${"=".repeat(70)}`);
console.log(` ANÁLISIS DOSIS → EFECTO`);
console.log(` Registros procesados: ${records.length} | Medicamentos: 2`);
console.log(`${"=".repeat(70)}\n`);

if (findings.length === 0) {
  console.log("  Sin patrones detectados.");
} else {
  findings.forEach((f, i) => {
    const emoji = f.tipo === "beneficio" ? "✅" : "⚠️";
    const nivel = f.nivel === "patron_detectado" ? "[PATRÓN DETECTADO]" : "[patrón posible]";
    console.log(`${i + 1}. ${emoji}  ${nivel}`);
    console.log(`   Medicamento : ${f.medicamento}`);
    console.log(`   Dirección   : ${f.direccion_dosis}`);
    console.log(`   Métrica     : ${f.metrica_label}`);
    console.log(`   Tipo        : ${f.tipo}`);
    console.log(`   Eventos     : ${f.eventos_consistentes}/${f.eventos_totales} consistentes`);
    console.log(`   Confianza   : ${Math.round(f.score_confianza * 100)}%`);
    if (f.cambio_promedio_pct !== 0) {
      console.log(`   Cambio prom : ${f.cambio_promedio_pct > 0 ? "+" : ""}${f.cambio_promedio_pct}%`);
    }
    console.log(`   Resumen     : ${f.resumen_legible}`);
    console.log();
  });
  console.log(`─`.repeat(70));
  console.log(`⚕️  ${findings[0].aviso}`);
  console.log(`${"─".repeat(70)}\n`);
}
