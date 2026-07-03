import { Request, Response, NextFunction } from "express";

function isPrismaError(err: unknown): err is { code: string; name: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "name" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  void next;
  console.error(err);

  if (isPrismaError(err) && err.name === "PrismaClientKnownRequestError") {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Ya existe un registro con ese valor" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Registro no encontrado" });
      return;
    }
    res.status(400).json({ error: "Error de base de datos" });
    return;
  }

  if (err.name === "PrismaClientValidationError") {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  res.status(500).json({ error: "Error interno del servidor" });
}
