import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getRecords, createRecord, updateRecord } from "../controllers/records.controller";

const router = Router();
router.use(requireAuth);

router.get("/",      getRecords);
router.post("/",     createRecord);
router.put("/:id",   updateRecord);

export default router;
