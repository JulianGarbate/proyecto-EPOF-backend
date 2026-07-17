import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Reutilizar la instancia entre invocaciones sobre el mismo container cálido
// es lo que más importa en Vercel (serverless), donde NODE_ENV=production —
// justo el caso que el chequeo anterior excluía, forzando una conexión nueva
// a Supabase en cada request.
const prisma = global.prisma ?? new PrismaClient();
global.prisma = prisma;

export default prisma;
