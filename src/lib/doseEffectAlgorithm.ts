// Pure dose→effect detection algorithm — no DB dependencies.

export interface TrackerRecord {
  date: string;
  sleep: number;
  wakeUps: number;
  sleepQuality: string;
  energy: string;
  hasCrisis: boolean;
  bowelCount: number;
  feedQuality: string;
  attention: string;
  hasBehaviorIssue: boolean;
  doseAltered: boolean;
  alteredMedId: string | null;
  actualDose?: string | null;
  direccionAlteracion: string | null;
  alteraciones: unknown; // Prisma Json field
}

export interface Medication {
  id: string;
  name: string;
}

export interface AlgorithmConfig {
  W_antes: number;          // days before event to compute baseline
  D_washout: number;        // days to skip after event (immediate effect)
  W_despues: number;        // days after washout to observe effect
  min_dias_registrados: number; // minimum records required in each window
}

export const DEFAULT_CONFIG: AlgorithmConfig = {
  W_antes: 7,
  D_washout: 1,
  W_despues: 7,
  min_dias_registrados: 3,
};

export interface AnalysisFinding {
  medicamentoId: string;
  medicamento: string;
  direccion_dosis: string;
  metrica: string;
  metrica_label: string;
  tipo: "beneficio" | "consecuencia";
  eventos_totales: number;
  eventos_consistentes: number;
  cambio_promedio_pct: number;
  nivel: "posible_patron" | "patron_detectado";
  score_confianza: number;
  resumen_legible: string;
  aviso: string;
}

type MetricType = "numeric" | "ordinal" | "boolean";
type BenefitDir = "up" | "down";

interface MetricConfig {
  key: string;
  label: string;
  type: MetricType;
  benefitDir: BenefitDir;
  ordinalMap?: Record<string, number>;
}

export const METRIC_CONFIG: MetricConfig[] = [
  { key: "sleep",            label: "Horas de sueño",           type: "numeric", benefitDir: "up" },
  { key: "wakeUps",          label: "Despertares nocturnos",     type: "numeric", benefitDir: "down" },
  { key: "sleepQuality",     label: "Calidad del sueño",         type: "ordinal", benefitDir: "up",
    ordinalMap: { mala: 0, malo: 0, regular: 1, buena: 2, bueno: 2 } },
  { key: "energy",           label: "Energía",                   type: "ordinal", benefitDir: "up",
    ordinalMap: { baja: 0, bajo: 0, media: 1, medio: 1, alta: 2, alto: 2 } },
  { key: "hasCrisis",        label: "Presencia de crisis",       type: "boolean", benefitDir: "down" },
  { key: "bowelCount",       label: "Deposiciones",              type: "numeric", benefitDir: "up" },
  { key: "feedQuality",      label: "Calidad de alimentación",   type: "ordinal", benefitDir: "up",
    ordinalMap: { mala: 0, malo: 0, regular: 1, buena: 2, bueno: 2 } },
  { key: "attention",        label: "Nivel de atención",         type: "ordinal", benefitDir: "up",
    ordinalMap: { baja: 0, bajo: 0, media: 1, medio: 1, alta: 2, alto: 2 } },
  { key: "hasBehaviorIssue", label: "Problemas de conducta",     type: "boolean", benefitDir: "down" },
];

const DISCLAIMER =
  "AVISO MÉDICO: Esta información es orientativa y se basa en registros históricos. " +
  "No reemplaza el criterio clínico. Consulte siempre con el especialista antes de modificar la medicación.";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

interface ParsedAlt {
  medId: string;
  dosis: string;
  direccion: string;
}

function parseAlteraciones(raw: unknown): ParsedAlt[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && "medId" in item && "direccion" in item
    )
    .map((item) => ({
      medId:    String(item.medId),
      dosis:    String(item.dosis ?? ""),
      direccion: String(item.direccion),
    }));
}

function getEventAlts(r: TrackerRecord): ParsedAlt[] {
  const fromJson = parseAlteraciones(r.alteraciones);
  if (fromJson.length > 0) return fromJson;
  if (r.doseAltered && r.alteredMedId && r.direccionAlteracion) {
    return [{ medId: r.alteredMedId, dosis: r.actualDose ?? "", direccion: r.direccionAlteracion }];
  }
  return [];
}

function toNumeric(val: unknown, m: MetricConfig): number | null {
  if (val === null || val === undefined) return null;
  if (m.type === "numeric") {
    const n = typeof val === "number" ? val : parseFloat(String(val));
    return isNaN(n) ? null : n;
  }
  if (m.type === "ordinal") {
    const s = String(val).toLowerCase().trim();
    return m.ordinalMap && s in m.ordinalMap ? m.ordinalMap[s] : null;
  }
  // boolean — only accept actual booleans or the strings "true"/"false"
  if (typeof val === "boolean") return val ? 1 : 0;
  if (val === "true")  return 1;
  if (val === "false") return 0;
  return null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function runDoseEffectAnalysis(
  records: TrackerRecord[],
  medications: Medication[],
  config: AlgorithmConfig = DEFAULT_CONFIG,
): AnalysisFinding[] {
  const { W_antes, D_washout, W_despues, min_dias_registrados } = config;

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // Flat list of all alteration events
  interface DoseEvent { date: string; medId: string; direccion: string; }
  const allEvents: DoseEvent[] = [];
  for (const r of sorted) {
    for (const alt of getEventAlts(r)) {
      allEvents.push({ date: r.date, medId: alt.medId, direccion: alt.direccion });
    }
  }

  const findings: AnalysisFinding[] = [];

  for (const med of medications) {
    for (const dir of ["subida", "bajada", "mantenida"] as const) {
      const events = allEvents.filter((e) => e.medId === med.id && e.direccion === dir);
      if (events.length < 2) continue; // K will be < 2, skip early

      for (const metric of METRIC_CONFIG) {
        interface EventResult {
          delta: number | null;
          avgBefore: number | null;
          pctChange: number | null;
        }
        const results: EventResult[] = [];

        for (const event of events) {
          const beforeFrom = addDays(event.date, -W_antes);
          const beforeTo   = addDays(event.date, -1);
          const afterFrom  = addDays(event.date, D_washout + 1);
          const afterTo    = addDays(event.date, D_washout + W_despues);

          const beforeRecs = sorted.filter((r) => r.date >= beforeFrom && r.date <= beforeTo);
          const afterRecs  = sorted.filter((r) => r.date >= afterFrom  && r.date <= afterTo);

          // Confounder: any OTHER medication changed within the effect window
          const hasConfounder = allEvents.some(
            (e) => e.medId !== med.id && e.date >= afterFrom && e.date <= afterTo,
          );

          if (
            hasConfounder ||
            beforeRecs.length < min_dias_registrados ||
            afterRecs.length  < min_dias_registrados
          ) {
            results.push({ delta: null, avgBefore: null, pctChange: null });
            continue;
          }

          const key = metric.key as keyof TrackerRecord;
          const beforeVals = beforeRecs
            .map((r) => toNumeric(r[key], metric))
            .filter((v): v is number => v !== null);
          const afterVals  = afterRecs
            .map((r) => toNumeric(r[key], metric))
            .filter((v): v is number => v !== null);

          const avgBefore = mean(beforeVals);
          const avgAfter  = mean(afterVals);

          if (avgBefore === null || avgAfter === null) {
            results.push({ delta: null, avgBefore: null, pctChange: null });
            continue;
          }

          const delta = avgAfter - avgBefore;
          const pctChange = avgBefore !== 0 ? (delta / avgBefore) * 100 : null;
          results.push({ delta, avgBefore, pctChange });
        }

        const valid = results.filter((r) => r.delta !== null);
        const K = valid.length;
        if (K < 2) continue;

        const kBenefit = valid.filter((r) =>
          metric.benefitDir === "up" ? (r.delta ?? 0) > 0 : (r.delta ?? 0) < 0,
        ).length;

        const kConsequence = valid.filter((r) =>
          metric.benefitDir === "up" ? (r.delta ?? 0) < 0 : (r.delta ?? 0) > 0,
        ).length;

        const tipo: "beneficio" | "consecuencia" = kBenefit >= kConsequence ? "beneficio" : "consecuencia";
        const k = tipo === "beneficio" ? kBenefit : kConsequence;

        if (k < 2) continue;

        const ratio = k / K;

        let nivel: "posible_patron" | "patron_detectado" | null = null;
        if (k >= 3 && ratio >= 0.66)      nivel = "patron_detectado";
        else if (k >= 2 && ratio >= 0.50) nivel = "posible_patron";
        if (!nivel) continue;

        // Average % change for consistent events
        const consistent = valid.filter((r) =>
          tipo === "beneficio"
            ? (metric.benefitDir === "up" ? (r.delta ?? 0) > 0 : (r.delta ?? 0) < 0)
            : (metric.benefitDir === "up" ? (r.delta ?? 0) < 0 : (r.delta ?? 0) > 0),
        );
        const pcts = consistent
          .map((r) => r.pctChange)
          .filter((v): v is number => v !== null);
        const cambio_promedio_pct = Math.round((mean(pcts) ?? 0) * 10) / 10;

        const dirLabel  = dir === "subida" ? "subida" : dir === "bajada" ? "bajada" : "mantenida";
        const tipoLabel = tipo === "beneficio" ? "mejora" : "empeoramiento";
        const nivelLabel = nivel === "patron_detectado" ? "Patrón detectado" : "Patrón posible";
        const pctStr    = cambio_promedio_pct !== 0
          ? ` (${cambio_promedio_pct > 0 ? "+" : ""}${cambio_promedio_pct}%)`
          : "";

        findings.push({
          medicamentoId:    med.id,
          medicamento:      med.name,
          direccion_dosis:  dir,
          metrica:          metric.key,
          metrica_label:    metric.label,
          tipo,
          eventos_totales:       K,
          eventos_consistentes:  k,
          cambio_promedio_pct,
          nivel,
          score_confianza: Math.round(ratio * 100) / 100,
          resumen_legible:
            `Tras ${K} evento${K > 1 ? "s" : ""} de ${dirLabel} de dosis de ${med.name}, ` +
            `en ${k} de ${K} ocasiones se observó ${tipoLabel} en "${metric.label}"${pctStr}. ` +
            `${nivelLabel}.`,
          aviso: DISCLAIMER,
        });
      }
    }
  }

  // Sort: patron_detectado first, then by score_confianza desc
  return findings.sort((a, b) => {
    const ns = (n: string) => n === "patron_detectado" ? 1 : 0;
    const dn = ns(b.nivel) - ns(a.nivel);
    return dn !== 0 ? dn : b.score_confianza - a.score_confianza;
  });
}
