import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...");

  // ── Usuario demo ────────────────────────────────────────────────────────────
  const hashedPw = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@neurotracker.com" },
    update: {},
    create: { name: "María González", email: "demo@neurotracker.com", password: hashedPw },
  });
  console.log("✓ Usuario:", user.email);

  // ── Niño demo ────────────────────────────────────────────────────────────────
  let ninio = await prisma.ninio.findFirst({ where: { userId: user.id } });
  if (!ninio) {
    ninio = await prisma.ninio.create({
      data: {
        userId:       user.id,
        fullName:     "Mateo González",
        age:          7,
        weight:       22.5,
        height:       118,
        diagnosticos: ["Síndrome de Dravet", "Epilepsia refractaria"],
        rescueMed:        "Diazepam",
        rescueDose:       "0.5 mg/kg por vía rectal",
        alertMinutes:     3,
        ambulanceMinutes: 5,
        emergencyPhone:   "+54 9 11 5555-1234",
      },
    });
  }
  console.log("✓ Niño:", ninio.fullName);

  // ── Medicamentos ─────────────────────────────────────────────────────────────
  await prisma.medicacion.deleteMany({ where: { ninioId: ninio.id } });
  const meds = await Promise.all([
    prisma.medicacion.create({
      data: {
        ninioId:          ninio.id,
        name:             "Valproato sódico",
        dose:             "300 mg",
        horarios:         "08:00,20:00",
        dias:             [0, 1, 2, 3, 4, 5, 6],
        efectosSubida:    "Somnolencia\nTemblores\nAumento de apetito",
        efectosBajada:    "Mayor cantidad de crisis\nIrritabilidad",
        efectosMantenida: "Estabilidad del estado de ánimo",
      },
    }),
    prisma.medicacion.create({
      data: {
        ninioId:          ninio.id,
        name:             "Clobazam",
        dose:             "5 mg",
        horarios:         "21:00",
        dias:             [0, 1, 2, 3, 4, 5, 6],
        efectosSubida:    "Sedación\nDificultad para dormir\nCambios de humor",
        efectosBajada:    "Ansiedad\nMayor cantidad de crisis",
        efectosMantenida: null,
      },
    }),
    prisma.medicacion.create({
      data: {
        ninioId:          ninio.id,
        name:             "Stiripentol",
        dose:             "250 mg",
        horarios:         "08:00,13:00,20:00",
        dias:             [0, 1, 2, 3, 4, 5, 6],
        efectosSubida:    "Náuseas o vómitos\nDisminución del apetito",
        efectosBajada:    "Mayor cantidad de crisis",
        efectosMantenida: "Mejor control de crisis",
      },
    }),
  ]);
  console.log("✓ Medicamentos:", meds.map((m) => m.name).join(", "));

  // ── Consultas médicas ─────────────────────────────────────────────────────────
  await prisma.consulta.deleteMany({ where: { ninioId: ninio.id } });
  await prisma.consulta.createMany({
    data: [
      {
        ninioId:     ninio.id,
        date:        daysAgo(45),
        doctor:      "Dra. Laura Méndez",
        specialty:   "Neurología pediátrica",
        summary:     "Control trimestral. EEG con leve mejoría respecto al control anterior. Se observan menos descargas interictales.",
        indications: "Mantener dosis actual de Valproato. Aumentar Clobazam a 7.5mg nocturno si hay más de 2 crisis en 2 semanas.",
        nextDate:    daysAgo(-45),
      },
      {
        ninioId:     ninio.id,
        date:        daysAgo(15),
        doctor:      "Dr. Rodrigo Funes",
        specialty:   "Genética médica",
        summary:     "Se confirma variante patogénica en gen SCN1A compatble con Síndrome de Dravet. Se recomienda estudio a padres.",
        indications: "Evitar fármacos bloqueantes de canales de sodio (Lamotrigina, Carbamazepina). Solicitar estudio genético parental.",
        nextDate:    daysAgo(-90),
      },
    ],
  });
  console.log("✓ Consultas creadas");

  // ── Tracker — últimos 30 días ─────────────────────────────────────────────────
  await prisma.tracker.deleteMany({ where: { ninioId: ninio.id } });

  const MOODS_POOL  = ["Tranquilo", "Feliz", "Irritable", "Ansioso", "Cansado", "Activo"];
  const ENERGY_OPTS = ["Muy bajo", "Bajo", "Moderado", "Alto"];
  const SLEEP_Q     = ["Malo", "Regular", "Bueno", "Excelente"];

  for (let i = 29; i >= 0; i--) {
    const date      = daysAgo(i);
    const hasCrisis = i % 7 === 0 || i === 3 || i === 12; // crisis esporádicas
    const tookAll   = Math.random() > 0.1;                // 90% adherencia
    const sleepHrs  = 7 + Math.random() * 2.5;            // 7–9.5h
    const wakeUps   = Math.floor(Math.random() * 3);

    // Crisis entry si corresponde
    const crisisEntry = hasCrisis ? [{
      startTime:    `${String(1 + Math.floor(Math.random() * 3)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
      endTime:      "",
      durationHrs:  0,
      durationMin:  Math.floor(1 + Math.random() * 4),
      durationSec:  Math.floor(Math.random() * 60),
      types:        [["Mioclónicas", "Ausencias", "Atónicas"][Math.floor(Math.random() * 3)]],
      otherType:    "",
      severity:     ["Leve", "Moderada", "Severa"][Math.floor(Math.random() * 3)],
      requiredRescue: Math.random() > 0.7,
      requiredER:   Math.random() > 0.9,
      triggers:     ["Fiebre leve", "Poco sueño", "Mucha estimulación visual", ""][Math.floor(Math.random() * 4)],
    }] : [];

    const moodCount = 1 + Math.floor(Math.random() * 3);
    const moods     = shuffle(MOODS_POOL).slice(0, moodCount);

    await prisma.tracker.create({
      data: {
        ninioId:       ninio.id,
        date,
        sleep:         parseFloat(sleepHrs.toFixed(1)),
        wakeUps,
        sleepQuality:  SLEEP_Q[wakeUps === 0 ? 3 : wakeUps === 1 ? 2 : 1],
        moods,
        energy:        ENERGY_OPTS[Math.floor(Math.random() * ENERGY_OPTS.length)],
        hasCrisis,
        crisisTypes:   crisisEntry[0]?.types ?? [],
        otherType:     null,
        crisisSeverity: crisisEntry[0]?.severity ?? null,
        requiredRescue: crisisEntry[0]?.requiredRescue ?? false,
        requiredER:    crisisEntry[0]?.requiredER ?? false,
        startTime:     crisisEntry[0]?.startTime ?? null,
        durationHrs:   0,
        durationMin:   crisisEntry[0]?.durationMin ?? 0,
        durationSec:   crisisEntry[0]?.durationSec ?? 0,
        triggers:      crisisEntry[0]?.triggers ?? null,
        crises:        crisisEntry.length ? crisisEntry : [],
        feedQuality:   Math.random() > 0.2 ? "Buena" : "Regular",
        hasRejection:  Math.random() > 0.7,
        rejectedMeals: Math.random() > 0.7 ? [["Desayuno", "Almuerzo", "Cena"][Math.floor(Math.random() * 3)]] : [],
        mealNote:      null,
        bowelCount:    1 + Math.floor(Math.random() * 2),
        bristolTypes:  ["Tipo 3", "Tipo 4"][Math.floor(Math.random() * 2)] ? ["Tipo 4"] : ["Tipo 3"],
        tookAllMeds:   tookAll,
        missedMedIds:  tookAll ? [] : [meds[Math.floor(Math.random() * meds.length)].id],
        doseAltered:   false,
        alteredMedId:  null,
        actualDose:    null,
        direccionAlteracion: null,
        alteraciones:  [],
        efectosObservados: [],
        hadTherapy:    i % 5 === 0,
        therapyDetail: i % 5 === 0 ? "Fonoaudiología y terapia ocupacional" : null,
        attention:     ["Bajo", "Regular", "Alto"][Math.floor(Math.random() * 3)],
        achievements:  i % 4 === 0 ? "Completó una actividad de pintura sin frustrarse" : null,
        hasBehaviorIssue: Math.random() > 0.75,
        behaviorDetail: null,
        regulation:    null,
        notes:         i % 6 === 0 ? "Día tranquilo, buen humor general." : null,
      },
    });
  }
  console.log("✓ Tracker: 30 días de registros creados");

  // ── Crisis ────────────────────────────────────────────────────────────────────
  await prisma.crisis.deleteMany({ where: { ninioId: ninio.id } });
  for (const d of [29, 22, 15, 8, 3].map(daysAgo)) {
    const start = new Date(d + "T02:15:00.000Z");
    const end   = new Date(start.getTime() + (2 + Math.floor(Math.random() * 3)) * 60 * 1000);
    await prisma.crisis.create({
      data: {
        ninioId:     ninio.id,
        startTime:   start.toISOString(),
        endTime:     end.toISOString(),
        durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
      },
    });
  }
  console.log("✓ Crisis: 5 episodios registrados");

  console.log("\n✅ Seed completo!");
  console.log("   Email:    demo@neurotracker.com");
  console.log("   Password: demo1234");
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
