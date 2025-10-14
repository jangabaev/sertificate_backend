import { Router } from "express";
import { registerUser,getUsers } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerUser);
router.get("/",getUsers)

export default router;
