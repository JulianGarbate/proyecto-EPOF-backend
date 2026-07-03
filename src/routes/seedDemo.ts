// TEMPORARY — seed demo data. Remove after use.
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

const SEED_SECRET = process.env.SEED_SECRET ?? "epof-seed-2026";

router.post("/", async (req: Request, res: Response): Promise<void> => {
  if (req.headers["x-seed-secret"] !== SEED_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Get the demo patient's medications
  const meds = await prisma.medication.findMany({
    where: { ninioId: "aa2ca26e-9c48-4dd2-9b03-87ed010bc15d" },
    select: { id: true, name: true },
  });

  res.json({ meds });
});

export default router;
