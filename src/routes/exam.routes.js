import { Router } from "express";
import {
  postExam,
  getExams,
  studentResponce,
  getExam
} from "../controllers/exam.controller.js";

const router = Router();

router.post("/", postExam);
router.get("/", getExams)
router.patch("/:id", studentResponce)
router.get("/:id", getExam)

export default router
