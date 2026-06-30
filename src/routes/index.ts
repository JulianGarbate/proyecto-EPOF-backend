import { Router } from "express";
import authRouter    from "./auth";
import niniosRouter  from "./ninios";
import patientsRouter from "./patients";
import recordsRouter from "./records";
import crisisRouter  from "./crisis";
import shareRouter   from "./share";

const router = Router();

router.get("/health", (_req, res) => { res.json({ status: "ok" }); });

router.use("/auth",     authRouter);
router.use("/ninios",   niniosRouter);
router.use("/patients", patientsRouter);
router.use("/records",  recordsRouter);
router.use("/crisis",   crisisRouter);
router.use("/share",    shareRouter);

export default router;
