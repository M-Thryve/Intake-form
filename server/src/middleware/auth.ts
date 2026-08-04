import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { getConfig } from "../lib/config.js";
import { supabase } from "../lib/supabase.js";

export type UserRole =
  | "intake_operator"
  | "owner"
  | "architect"
  | "finance"
  | "builder"
  | "admin";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      isInternalService?: boolean;
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
];

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, error: "Authorization header required" });
    return;
  }

  const config = getConfig();

  // Check for internal service key (used by scanner, background jobs)
  if (config.API_INTERNAL_KEY && authHeader === `Bearer ${config.API_INTERNAL_KEY}`) {
    req.isInternalService = true;
    next();
    return;
  }

  // Verify Supabase JWT
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ success: false, error: "Bearer token required" });
    return;
  }

  const anonClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  anonClient.auth
    .getUser(token)
    .then(async ({ data, error }) => {
      if (error || !data.user) {
        res.status(401).json({ success: false, error: "Invalid or expired token" });
        return;
      }

      // Look up the user's role from the users table (via service-role client)
      const { data: userRecord, error: userErr } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (userErr || !userRecord) {
        res.status(403).json({
          success: false,
          error: "User not registered in the system. Contact an administrator.",
        });
        return;
      }

      if (!INTERNAL_ROLES.includes(userRecord.role as UserRole)) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions",
        });
        return;
      }

      req.user = {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role as UserRole,
      };

      next();
    })
    .catch(() => {
      res.status(401).json({ success: false, error: "Token verification failed" });
    });
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.isInternalService) {
      next();
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `This action requires one of these roles: ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
}
