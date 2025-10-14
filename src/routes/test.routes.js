import { Router } from "express";
import { checkTest,getTests } from "../controllers/test.controller.js";

const router = Router();

router.post("/", checkTest);
router.get("/", getTests);

export default router;
