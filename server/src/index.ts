import express from "express"
import cors from "cors"
import { validateConfig, preflightCheck } from "./lib/config.js"
import { requireAuth, requireClientAuth } from "./middleware/auth.js"
import { intakeRouter } from "./routes/intakes.js"
import { assetRouter } from "./routes/assets.js"
import { analysisRouter } from "./routes/analysis.js"
import { consoleRouter } from "./routes/console.js"
import { agreementRouter } from "./routes/agreement.js"
import { financeRouter } from "./routes/finance.js"
import { buildDeliveryRouter } from "./routes/build-delivery.js"
import { buildOrchestrationRouter } from "./routes/build-orchestration.js"
import { portalRouter } from "./routes/portal.js"
import { paymentRouter } from "./routes/payments.js"
import { internalOutboxRouter } from "./routes/internal-outbox.js"
import { requireInternalService } from "./middleware/internal-auth.js"

const preflight = preflightCheck()
if (!preflight.ok) {
  console.error("\n=== PREFLIGHT CHECK FAILED ===")
  for (const err of preflight.errors) {
    console.error(`  ✗ ${err}`)
  }
  console.error("\nSee .env.example for required variables.\n")
  process.exit(1)
}

const config = validateConfig()

function parseOrigins(raw: string): string[] | true {
  if (raw === "*" || raw === "") return true
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
}

const app = express()

app.use(
  cors({
    origin: parseOrigins(config.ALLOWED_ORIGINS),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Intake-Command",
      "apikey",
    ],
  }),
)

app.use(express.json({ limit: "1mb" }))

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: config.NODE_ENV })
})

app.use("/api/portal", requireClientAuth, portalRouter)
// Intake creation, draft resume, and lifecycle mutations are protected inside
// the router so the internal SPA cannot fall back to an anonymous save path.
app.use("/api/intakes", requireAuth, intakeRouter)
app.use("/api/assets", requireAuth, assetRouter)
app.use("/api/analysis", requireAuth, analysisRouter)
app.use("/api/console", requireAuth, consoleRouter)
app.use("/api/agreement", requireAuth, agreementRouter)
app.use("/api/finance", requireAuth, financeRouter)
app.use("/api/build-delivery", requireAuth, buildDeliveryRouter)
app.use("/api/build-orchestration", requireAuth, buildOrchestrationRouter)
app.use("/api/payments", paymentRouter)
app.use("/api/internal/outbox", requireInternalService, internalOutboxRouter)

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" })
})

app.listen(config.PORT, () => {
  console.log(
    `Intake API server running on http://localhost:${config.PORT} [${config.NODE_ENV}]`,
  )
})

export { app }
