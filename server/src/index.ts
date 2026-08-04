import express from "express";
import cors from "cors";
import { validateConfig, preflightCheck } from "./lib/config.js";
import { intakeRouter } from "./routes/intakes.js";
import { assetRouter } from "./routes/assets.js";

const preflight = preflightCheck();
if (!preflight.ok) {
  console.error("\n=== PREFLIGHT CHECK FAILED ===");
  for (const err of preflight.errors) {
    console.error(`  ✗ ${err}`);
  }
  console.error("\nSee .env.example for required variables.\n");
  process.exit(1);
}

const config = validateConfig();

const app = express();

app.use(cors({
  origin: true,
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "apikey"],
}));

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: config.NODE_ENV });
});

app.use("/api/intakes", intakeRouter);
app.use("/api/assets", assetRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

app.listen(config.PORT, () => {
  console.log(`Intake API server running on http://localhost:${config.PORT} [${config.NODE_ENV}]`);
});

export { app };
