import { Router } from "express";
import {
  postExam,
  getExams,
  studentResponce,
  getExam,
  exportExamExcel,
  importStudents
} from "../controllers/exam.controller.js";

const router = Router();

router.post("/", postExam);
router.get("/", getExams)
router.patch("/:id", studentResponce)
router.post("/:id/import", importStudents)
router.get("/:id/export", exportExamExcel)
router.get("/:id", getExam)

export default router
