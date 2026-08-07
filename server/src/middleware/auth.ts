import type { Request, Response, NextFunction } from "express"
import { createClient } from "@supabase/supabase-js"
import { getConfig } from "../lib/config.js"
import { supabase } from "../lib/supabase.js"

export type UserRole = "intake_operator" | "owner" | "architect" | "finance" | "builder" | "admin"
export type ClientRole = "client"
export const CLIENT_ROLE: ClientRole = "client"

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
}

export interface AuthenticatedClient {
  role: ClientRole
  userId: string
  clientId: string
  email: string
  fullName: string | null
  company: string | null
  status: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      client?: AuthenticatedClient
      isInternalService?: boolean
    }
  }
}

const INTERNAL_ROLES: UserRole[] = [
  "intake_operator",
  "owner",
  "architect",
  "finance",
  "builder",
  "admin",
]

export function requireAuth(
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

  // Check for internal service key (used by scanner, background jobs)
  if (
    config.API_INTERNAL_KEY &&
    authHeader === `Bearer ${config.API_INTERNAL_KEY}`
  ) {
    req.isInternalService = true
    next()
    return
  }

  // Verify Supabase JWT
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = tokenMatch?.[1]?.trim()
  if (!token) {
    res.status(401).json({ success: false, error: "Bearer token required" })
    return
  }

  const anonClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  )

  anonClient.auth
    .getUser(token)
    .then(async ({ data, error }) => {
      if (error || !data.user) {
        res
          .status(401)
          .json({ success: false, error: "Invalid or expired token" })
        return
      }

      // Look up the user's role from the users table (via service-role client)
      const { data: userRecord, error: userErr } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("id", data.user.id)
        .maybeSingle()

      if (userErr || !userRecord) {
        res.status(403).json({
          success: false,
          error: "User not registered in the system. Contact an administrator.",
        })
        return
      }

      if (!INTERNAL_ROLES.includes(userRecord.role as UserRole)) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions",
        })
        return
      }

      req.user = {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role as UserRole,
      }

      next()
    })
    .catch(() => {
      res
        .status(401)
        .json({ success: false, error: "Token verification failed" })
    })
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.isInternalService) {
      next()
      return
    }

    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `This action requires one of these roles: ${roles.join(", ")}`,
      })
      return
    }

    next()
  }
}

/** Client authentication is separate from internal-user role authentication. */
export function requireClientAuth(
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

  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = tokenMatch?.[1]?.trim()
  if (!token) {
    res.status(401).json({ success: false, error: "Bearer token required" })
    return
  }

  const config = getConfig()
  const anonClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  )

  anonClient.auth
    .getUser(token)
    .then(async ({ data, error }) => {
      if (error || !data.user) {
        res
          .status(401)
          .json({ success: false, error: "Invalid or expired token" })
        return
      }

      const { data: clientUser, error: lookupError } = await supabase
        .from("client_users")
        .select(
          "user_id, client_id, clients(id, email, full_name, company, status)",
        )
        .eq("user_id", data.user.id)
        .maybeSingle()

      if (lookupError || !clientUser) {
        res
          .status(403)
          .json({ success: false, error: "Portal access has not been granted" })
        return
      }

      const row = clientUser as Record<string, unknown>
      const client = row.clients as Record<string, unknown> | null
      if (!client || client.status === "archived") {
        res
          .status(403)
          .json({ success: false, error: "Portal access is unavailable" })
        return
      }

      req.client = {
        role: CLIENT_ROLE,
        userId: data.user.id,
        clientId: row.client_id as string,
        email: client.email as string | null || data.user.email || "",
        fullName: client.full_name as string | null || null,
        company: client.company as string | null || null,
        status: client.status as string || "prospect",
      }
      next()
    })
    .catch(() => {
      res
        .status(401)
        .json({ success: false, error: "Token verification failed" })
    })
}
