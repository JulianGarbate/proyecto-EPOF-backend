import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// GET /api/patients/:id/objetivos
export async function getObjetivos(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const objetivos = await prisma.objetivoTerapeutico.findMany({
    where: { ninioId: id },
    orderBy: { fechaInicio: "desc" },
  });
  res.json({ objetivos });
}

// POST /api/patients/:id/objetivos
export async function createObjetivo(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const { terapiaNombre, descripcion, estado, fechaInicio, fechaLogro } = req.body;
  if (!terapiaNombre || !descripcion || !fechaInicio) {
    res.status(400).json({ error: "Terapia, descripción y fecha de inicio son requeridos" });
    return;
  }

  const objetivo = await prisma.objetivoTerapeutico.create({
    data: {
      ninioId: id, terapiaNombre, descripcion, fechaInicio,
      estado: estado ?? "activo",
      fechaLogro: fechaLogro ?? null,
    },
  });
  res.status(201).json({ objetivo });
}

// PUT /api/patients/:id/objetivos/:objetivoId
export async function updateObjetivo(req: AuthRequest, res: Response) {
  const id          = req.params.id          as string;
  const objetivoId  = req.params.objetivoId  as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const existing = await prisma.objetivoTerapeutico.findFirst({ where: { id: objetivoId, ninioId: id } });
  if (!existing) { res.status(404).json({ error: "Objetivo no encontrado" }); return; }

  const { terapiaNombre, descripcion, estado, fechaInicio, fechaLogro } = req.body;
  const updated = await prisma.objetivoTerapeutico.update({
    where: { id: objetivoId },
    data: {
      ...(terapiaNombre && { terapiaNombre }),
      ...(descripcion   && { descripcion }),
      ...(estado        && { estado }),
      ...(fechaInicio   && { fechaInicio }),
      ...(fechaLogro    !== undefined && { fechaLogro: fechaLogro ?? null }),
    },
  });
  res.json({ objetivo: updated });
}

// DELETE /api/patients/:id/objetivos/:objetivoId
export async function deleteObjetivo(req: AuthRequest, res: Response) {
  const id         = req.params.id         as string;
  const objetivoId = req.params.objetivoId as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const existing = await prisma.objetivoTerapeutico.findFirst({ where: { id: objetivoId, ninioId: id } });
  if (!existing) { res.status(404).json({ error: "Objetivo no encontrado" }); return; }

  await prisma.objetivoTerapeutico.delete({ where: { id: objetivoId } });
  res.json({ ok: true });
}
