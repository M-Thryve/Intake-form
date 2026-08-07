import type { Request, Response, NextFunction } from "express"
import { getConfig } from "../lib/config.js"

export function requireInternalService(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res
      .status(401)
      .json({ success: false, error: "Authorization header required" })
    return
  }

  const config = getConfig()

  if (!config.API_INTERNAL_KEY) {
    res
      .status(503)
      .json({ success: false, error: "Internal service auth not configured" })
    return
  }

  if (authHeader !== `Bearer ${config.API_INTERNAL_KEY}`) {
    res.status(403).json({ success: false, error: "Invalid service key" })
    return
  }

  req.isInternalService = true
  next()
}
