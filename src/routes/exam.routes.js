import { Router } from "express";
import {
  postExam,
  getExams,
  studentResponce,
  getExam,
  exportExamExcel,
  importStudents,
  importExamExcel,
  upload,
} from "../controllers/exam.controller.js";

const router = Router();

router.post("/", postExam);
router.get("/", getExams)
router.patch("/:id", studentResponce)
router.post("/:id/import", importStudents)
router.post("/import-excel", upload.single("file"), importExamExcel)
router.get("/:id/export", exportExamExcel)
router.get("/:id", getExam)

export default router
