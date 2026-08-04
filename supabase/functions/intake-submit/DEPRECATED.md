# DEPRECATED — Do Not Deploy

This Supabase Edge Function was a Phase 2 prototype alternative to the Express API server.

**Decision (Phase 3):** The Express server at `server/` is the single production API path.
This function is retained for reference only and must NOT be deployed.

## Why

- Express server (`POST /api/intakes`) is fully implemented, tested, and documented.
- Maintaining two implementations with identical behavior creates drift risk.
- The Express server supports the full asset pipeline and environment configuration.

## If You Need Edge Function Deployment

If a future phase requires an Edge deployment path:

1. Open a new issue or phase proposal.
2. Ensure full parity with the Express implementation (validation, idempotency, transactions, Build Reference generation, asset pipeline).
3. Add parity tests.
4. Document routing, monitoring, and rollback procedures.
5. Get owner approval before deployment.

Do not deploy this function without completing the above steps.
