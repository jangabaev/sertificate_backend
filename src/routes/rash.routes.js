import { Router } from "express";
import {
  getRashmodule,
  stopRashmodule,
  updateExamKey,
  sendSertificateAndMessage,
  getCertificateStatus,
} from "../controllers/rash.controller.js";

const router = Router();

router.post("/stop/:examId", stopRashmodule);
router.patch("/:examId/key", updateExamKey);
router.get("/:examId", getRashmodule);
router.post("/sendmessage/:examId", sendSertificateAndMessage);
router.get("/exam/:examId/certificate-status", getCertificateStatus);

export default router;
