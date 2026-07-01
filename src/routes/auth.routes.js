import { Router } from "express";
import { createUser, getUsers, getUserbyId,upBalance } from "../controllers/auth.controller.js";

const router = Router();

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUserbyId);
router.post("/balance",upBalance)

export default router;
