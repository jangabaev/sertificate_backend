import { Router } from "express";
import {
  getRashmodule,
  stopRashmodule,
  updateExamKey,
  sendSertificateAndMessage,
} from "../controllers/rash.controller.js";

const router = Router();

router.post("/stop/:examId", stopRashmodule);
router.patch("/:examId/key", updateExamKey);
router.get("/:examId", getRashmodule);
router.get("/sendmessage/:examId", sendSertificateAndMessage);

export default router;
