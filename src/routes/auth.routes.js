// import { Router } from "express";
// import {
//   registerUser,
//   getUsers,
//   getUserById,
// } from "../controllers/auth.controller.js";

// const router = Router();

// router.post("/register", registerUser);
// router.get("/", getUsers);
// router.get("/:userId", getUserById);

// export default router;


const express = require("express")
const router = express.Router()

const {
   createUser,
   getUsers
} = require("../controllers/auth.controller")

router.post("/", createUser)
router.get("/", getUsers)

module.exports = router