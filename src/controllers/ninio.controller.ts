import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

// GET /api/ninios — todos los niños del cuidador autenticado
export async function getNinios(req: AuthRequest, res: Response) {
  const ninios = await prisma.ninio.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "asc" },
  });
  res.json({ ninios });
}

// GET /api/ninios/:id — un niño específico (debe pertenecer al usuario)
export async function getNinio(req: AuthRequest, res: Response) {
  const ninio = await prisma.ninio.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!ninio) { res.status(404).json({ error: "Niño no encontrado" }); return; }
  res.json({ ninio });
}

// POST /api/ninios — crear un niño asociado al cuidador
export async function createNinio(req: AuthRequest, res: Response) {
  const { fullName, weight, height, age, diagnostico } = req.body;

  if (!fullName || weight == null || height == null || age == null || !diagnostico) {
    res.status(400).json({ error: "Todos los campos son requeridos" });
    return;
  }

  const ninio = await prisma.ninio.create({
    data: {
      fullName,
      weight: parseFloat(weight),
      height: parseFloat(height),
      age: parseInt(age),
      diagnostico,
      userId: req.userId,
    },
  });
  res.status(201).json({ ninio });
}

// PUT /api/ninios/:id — actualizar datos del niño
export async function updateNinio(req: AuthRequest, res: Response) {
  const existing = await prisma.ninio.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) { res.status(404).json({ error: "Niño no encontrado" }); return; }

  const { fullName, weight, height, age, diagnostico } = req.body;
  const ninio = await prisma.ninio.update({
    where: { id: req.params.id },
    data: {
      ...(fullName && { fullName }),
      ...(weight != null && { weight: parseFloat(weight) }),
      ...(height != null && { height: parseFloat(height) }),
      ...(age != null && { age: parseInt(age) }),
      ...(diagnostico && { diagnostico }),
    },
  });
  res.json({ ninio });
}

// DELETE /api/ninios/:id
export async function deleteNinio(req: AuthRequest, res: Response) {
  const existing = await prisma.ninio.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) { res.status(404).json({ error: "Niño no encontrado" }); return; }

  await prisma.ninio.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}
