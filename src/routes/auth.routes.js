import { Router } from "express";
import {
  registerUser,
  getUsers,
  getUserById,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerUser);
router.get("/", getUsers);
router.get("/:userId", getUserById);

export default router;
