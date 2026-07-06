import { Response } from "express";
import { randomBytes } from "crypto";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/requireAuth";

export interface CuidadorPermissions {
  canFillTracker: boolean;
  canSeeHistory: boolean;
  canSeeMeds: boolean;
  canSeeCrisisProtocol: boolean;
}

const DEFAULT_PERMISSIONS: CuidadorPermissions = {
  canFillTracker: true,
  canSeeHistory: false,
  canSeeMeds: false,
  canSeeCrisisProtocol: false,
};

function asJson(v: unknown) { return v as never; }

async function ownedNinio(ninioId: string, userId: string) {
  return prisma.ninio.findFirst({ where: { id: ninioId, userId } });
}

// GET /api/caregiver/:ninioId — list cuidadores for a ninio (tutor only)
export async function listCuidadores(req: AuthRequest, res: Response) {
  const ninioId = req.params.ninioId as string;
  const ninio = await ownedNinio(ninioId, req.userId!);
  if (!ninio) { res.status(403).json({ error: "Sin permiso" }); return; }

  const rows = await prisma.cuidadorNinio.findMany({
    where: { ninioId },
    include: { cuidador: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json({ cuidadores: rows });
}

// POST /api/caregiver/:ninioId/invite — create invite link for an email
export async function inviteCuidador(req: AuthRequest, res: Response) {
  const ninioId = req.params.ninioId as string;
  const { email, permissions } = req.body as { email: string; permissions?: Partial<CuidadorPermissions> };

  if (!email) { res.status(400).json({ error: "email es requerido" }); return; }

  const ninio = await ownedNinio(ninioId, req.userId!);
  if (!ninio) { res.status(403).json({ error: "Sin permiso" }); return; }

  const inviteToken = randomBytes(24).toString("hex");
  const perms: CuidadorPermissions = { ...DEFAULT_PERMISSIONS, ...(permissions ?? {}) };

  const existingUser = await prisma.user.findUnique({ where: { email } });

  let invite;
  if (existingUser) {
    invite = await prisma.cuidadorNinio.upsert({
      where: { cuidadorId_ninioId: { cuidadorId: existingUser.id, ninioId } },
      create: {
        cuidadorId: existingUser.id,
        ninioId,
        permissions: asJson(perms),
        inviteToken,
        inviteEmail: email,
        accepted: false,
      },
      update: { permissions: asJson(perms), inviteToken, accepted: false },
    });
  } else {
    invite = await prisma.cuidadorNinio.create({
      data: {
        cuidadorId: req.userId!,
        ninioId,
        permissions: asJson(perms),
        inviteToken,
        inviteEmail: email,
        accepted: false,
      },
    });
  }

  const inviteUrl = `${process.env.FRONTEND_URL ?? ""}/cuidador/aceptar?token=${inviteToken}`;
  res.json({ ok: true, inviteToken, inviteUrl, invite });
}

// GET /api/caregiver/invite/:token — preview invite details before accepting (must be logged in)
export async function getInviteDetails(req: AuthRequest, res: Response) {
  const token = req.params.token as string;
  const invite = await prisma.cuidadorNinio.findUnique({
    where: { inviteToken: token },
    include: { ninio: { select: { fullName: true } } },
  });
  if (!invite) { res.status(404).json({ error: "Invitación no encontrada o ya usada" }); return; }
  res.json({
    inviteEmail: invite.inviteEmail,
    ninioName: invite.ninio.fullName,
    permissions: invite.permissions,
    accepted: invite.accepted,
  });
}

// POST /api/caregiver/accept — called when cuidador follows the invite link (must be logged in)
export async function acceptInvite(req: AuthRequest, res: Response) {
  const { token } = req.body as { token: string };
  if (!token) { res.status(400).json({ error: "token es requerido" }); return; }

  const invite = await prisma.cuidadorNinio.findUnique({ where: { inviteToken: token } });
  if (!invite) { res.status(404).json({ error: "Invitación no encontrada o ya usada" }); return; }
  if (invite.accepted) { res.json({ ok: true, already: true }); return; }

  await prisma.cuidadorNinio.update({
    where: { id: invite.id },
    data: { cuidadorId: req.userId!, accepted: true, inviteToken: null },
  });

  res.json({ ok: true, ninioId: invite.ninioId });
}

// PUT /api/caregiver/:ninioId/:cuidadorId/permissions — update permissions (tutor only)
export async function updatePermissions(req: AuthRequest, res: Response) {
  const ninioId = req.params.ninioId as string;
  const cuidadorId = req.params.cuidadorId as string;
  const { permissions } = req.body as { permissions: Partial<CuidadorPermissions> };

  const ninio = await ownedNinio(ninioId, req.userId!);
  if (!ninio) { res.status(403).json({ error: "Sin permiso" }); return; }

  const row = await prisma.cuidadorNinio.findUnique({
    where: { cuidadorId_ninioId: { cuidadorId, ninioId } },
  });
  if (!row) { res.status(404).json({ error: "Cuidador no encontrado" }); return; }

  const merged = { ...(row.permissions as object), ...permissions };
  const updated = await prisma.cuidadorNinio.update({
    where: { id: row.id },
    data: { permissions: asJson(merged) },
  });
  res.json({ ok: true, cuidador: updated });
}

// DELETE /api/caregiver/:ninioId/:cuidadorId — remove cuidador (tutor only)
export async function removeCuidador(req: AuthRequest, res: Response) {
  const ninioId = req.params.ninioId as string;
  const cuidadorId = req.params.cuidadorId as string;

  const ninio = await ownedNinio(ninioId, req.userId!);
  if (!ninio) { res.status(403).json({ error: "Sin permiso" }); return; }

  await prisma.cuidadorNinio.deleteMany({ where: { cuidadorId, ninioId } });
  res.json({ ok: true });
}

// GET /api/caregiver/my — for cuidador: list ninios they can access
export async function myAssignments(req: AuthRequest, res: Response) {
  const rows = await prisma.cuidadorNinio.findMany({
    where: { cuidadorId: req.userId!, accepted: true },
    include: {
      ninio: { select: { id: true } },
    },
  });
  res.json({ assignments: rows });
}
