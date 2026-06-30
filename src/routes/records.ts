import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getRecords, getRecordById, getAlterations, createRecord, updateRecord } from "../controllers/records.controller";

const router = Router();
router.use(requireAuth);

router.get("/alterations", getAlterations);
router.get("/",            getRecords);
router.post("/",           createRecord);
router.get("/:id",         getRecordById);
router.put("/:id",         updateRecord);

export default router;
