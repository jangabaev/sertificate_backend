import { Router } from "express";
import {
  addTestToExam,
  getExam,
  getExamActiveStatus,
  oneExamDetails,
  postExam,
} from "../controllers/exam.controller.js";

const router = Router();

router.get("/", getExam);
router.get("/:examId", oneExamDetails);
router.get("/active/test", getExamActiveStatus);
router.post("/", postExam);
router.patch("/:examId/test", addTestToExam);

export default router;
