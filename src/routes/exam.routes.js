import { Router } from "express";
import { getExam } from "../controllers/exam.controller.js";

const router=Router()

router.get("",getExam)

export default router