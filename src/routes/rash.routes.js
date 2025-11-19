import { Router } from "express";
import {
  getRashmodule,
  stopRashmodule,
} from "../controllers/rash.controller.js";

const router = Router();

router.get("/:examId", getRashmodule);
router.get("/stop/:examId", stopRashmodule);

export default router;
