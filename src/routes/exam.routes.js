import { Router } from "express";
import {
  postExam,
  getExams,
  studentResponce
} from "../controllers/exam.controller.js";

const router = Router();

router.post("/", postExam);
router.get("/", getExams)
router.patch("/:id", studentResponce)

export default router
