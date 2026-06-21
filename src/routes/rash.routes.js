import { Router } from "express";
import { getRashmodule, stopRashmodule, updateExamKey } from "../controllers/rash.controller.js";

const router = Router();

router.post("/stop/:examId", stopRashmodule);
router.patch("/:examId/key", updateExamKey);
router.get("/:examId", getRashmodule);

export default router;
