import prisma from "./prisma";

export type CuidadorPermission =
  | "canFillTracker"
  | "canSeeHistory"
  | "canSeeMeds"
  | "canSeeCrisisProtocol";

/**
 * Returns the niño if the user may access it, otherwise null.
 * - The owner (tutor) always has access.
 * - An accepted caregiver has access when they hold at least one of `anyOf`
 *   permissions (or when `anyOf` is empty, any accepted assignment).
 */
export async function accessibleNinio(
  ninioId: string,
  userId: string,
  anyOf: CuidadorPermission[] = []
) {
  const owned = await prisma.ninio.findFirst({ where: { id: ninioId, userId } });
  if (owned) return owned;

  const assignment = await prisma.cuidadorNinio.findFirst({
    where: { ninioId, cuidadorId: userId, accepted: true },
    include: { ninio: true },
  });
  if (!assignment) return null;

  if (anyOf.length === 0) return assignment.ninio;

  const perms = (assignment.permissions ?? {}) as Record<string, boolean>;
  const granted = anyOf.some((p) => perms[p]);
  return granted ? assignment.ninio : null;
}
