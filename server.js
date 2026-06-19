import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import userRoutes from "./src/routes/auth.routes.js";
import examRoutes from "./src/routes/exam.routes.js";
import rashRoutes from "./src/routes/rash.routes.js";

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

app.use("/users", userRoutes);
app.use("/test", examRoutes);
app.use("/rash", rashRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

