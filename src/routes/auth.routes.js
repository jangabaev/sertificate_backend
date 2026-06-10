import { Router } from "express";
import { createUser, getUsers, getUserbyId } from "../controllers/auth.controller.js";

const router = Router();

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUserbyId);

export default router;
