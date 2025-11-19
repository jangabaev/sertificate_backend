import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import testRoutes from "./src/routes/test.routes.js";
import userRoutes from "./src/routes/auth.routes.js";
import rashRoutes from "./src/routes/rash.routes.js";
import examRoutes from "./src/routes/exam.routes.js";
import { connectDB } from "./src/config/db.js";
connectDB();

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);
app.use(cors());
app.use(bodyParser.json());
app.use("/api/tests", testRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rash", rashRoutes);
app.use("/api/exam", examRoutes);

const PORT = 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Server is running on port ${PORT}`)
);
