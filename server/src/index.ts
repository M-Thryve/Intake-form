import express from "express";
import cors from "cors";
import { intakeRouter } from "./routes/intakes.js";

const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();

app.use(cors({
  origin: true,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "apikey"],
}));

app.use(express.json({ limit: "1mb" }));

app.use("/api/intakes", intakeRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Intake API server running on http://localhost:${PORT}`);
});

export { app };
