import { Router } from "express";
import { getRashmodule } from "../controllers/rash.controller.js";

const router=Router()

router.get("/",getRashmodule)

export default router

