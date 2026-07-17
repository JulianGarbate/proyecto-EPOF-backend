import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// GET /api/patients/:id/hospitalizaciones
export async function getHospitalizaciones(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const hospitalizaciones = await prisma.hospitalizacion.findMany({
    where: { ninioId: id },
    orderBy: { startDate: "desc" },
  });
  res.json({ hospitalizaciones });
}

// POST /api/patients/:id/hospitalizaciones
export async function createHospitalizacion(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const { startDate, endDate, motivo, hospital, medicosInvolucrados, notas } = req.body;
  if (!startDate || !motivo) {
    res.status(400).json({ error: "Fecha de inicio y motivo son requeridos" });
    return;
  }

  const created = await prisma.hospitalizacion.create({
    data: {
      ninioId: id, startDate, motivo,
      endDate: endDate ?? null,
      hospital: hospital ?? null,
      medicosInvolucrados: medicosInvolucrados ?? null,
      notas: notas ?? null,
    },
  });
  res.status(201).json({ hospitalizacion: created });
}

// PUT /api/patients/:id/hospitalizaciones/:hospId
export async function updateHospitalizacion(req: AuthRequest, res: Response) {
  const id     = req.params.id     as string;
  const hospId = req.params.hospId as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const existing = await prisma.hospitalizacion.findFirst({ where: { id: hospId, ninioId: id } });
  if (!existing) { res.status(404).json({ error: "Registro no encontrado" }); return; }

  const { startDate, endDate, motivo, hospital, medicosInvolucrados, notas } = req.body;
  const updated = await prisma.hospitalizacion.update({
    where: { id: hospId },
    data: {
      ...(startDate            && { startDate }),
      ...(endDate               !== undefined && { endDate: endDate ?? null }),
      ...(motivo                && { motivo }),
      ...(hospital               !== undefined && { hospital: hospital ?? null }),
      ...(medicosInvolucrados    !== undefined && { medicosInvolucrados: medicosInvolucrados ?? null }),
      ...(notas                  !== undefined && { notas: notas ?? null }),
    },
  });
  res.json({ hospitalizacion: updated });
}

// DELETE /api/patients/:id/hospitalizaciones/:hospId
export async function deleteHospitalizacion(req: AuthRequest, res: Response) {
  const id     = req.params.id     as string;
  const hospId = req.params.hospId as string;
  const ninio = await ownedNinio(id, req.userId!);
  if (!ninio) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

  const existing = await prisma.hospitalizacion.findFirst({ where: { id: hospId, ninioId: id } });
  if (!existing) { res.status(404).json({ error: "Registro no encontrado" }); return; }

  await prisma.hospitalizacion.delete({ where: { id: hospId } });
  res.json({ ok: true });
}
