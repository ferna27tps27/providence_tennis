/**
 * Authentication middleware for Express
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./session-manager";
import { UnauthorizedError, ForbiddenError } from "../errors/auth-errors";

// Extend Express Request to include session
declare global {
  namespace Express {
    interface Request {
      session?: {
        memberId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No authentication token provided");
    }
    
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify token
    const session = verifyToken(token);
    
    if (!session) {
      throw new UnauthorizedError("Invalid or expired token");
    }
    
    // Attach session to request
    req.session = {
      memberId: session.memberId,
      email: session.email,
      role: session.role,
    };
    
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(401).json({
        error: "Authentication failed",
        code: "AUTHENTICATION_FAILED",
      });
    }
  }
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // First check authentication
      if (!req.session) {
        throw new UnauthorizedError("Authentication required");
      }
      
      // Check if user has required role
      if (!allowedRoles.includes(req.session.role)) {
        throw new ForbiddenError(
          `Access denied. Required role: ${allowedRoles.join(" or ")}`
        );
      }
      
      next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          error: error.message,
          code: error.code,
        });
      } else if (error instanceof ForbiddenError) {
        res.status(403).json({
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(403).json({
          error: "Access denied",
          code: "FORBIDDEN",
        });
      }
    }
  };
}

/**
 * Optional authentication - attaches session if token is valid, but doesn't require it
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = verifyToken(token);
      
      if (session) {
        req.session = {
          memberId: session.memberId,
          email: session.email,
          role: session.role,
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
}
