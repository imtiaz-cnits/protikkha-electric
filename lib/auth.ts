import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "protikkha_electric_super_secret_jwt_key_2026_codenext_it";

export interface TokenPayload {
  userId: number;
  email: string | null;
  name: string;
  role: string;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash (supports both standard $2a$ and Laravel $2y$ hashes)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  // If hash is Laravel $2y$, bcryptjs supports it, but just in case replace $2y$ with $2a$ if needed
  const normalizedHash = hash.startsWith("$2y$") ? "$2a$" + hash.slice(4) : hash;
  return bcrypt.compare(password, normalizedHash);
}

/**
 * Sign JWT token
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Get authenticated user from request (checks Authorization header and Cookies)
 */
export async function getAuthUser(req?: NextRequest) {
  try {
    let token: string | undefined;

    if (req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else {
        token = req.cookies.get("token")?.value;
      }
    } else {
      try {
        const nextHeaders: any = await import("next/headers");
        const cookieStore = await nextHeaders.cookies();
        token = cookieStore.get("token")?.value;
      } catch {
        token = undefined;
      }
    }

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return null;

    const user = await prisma.users.findUnique({
      where: { id: BigInt(payload.userId) },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        permissions: true,
        img_url: true,
      },
    });

    if (!user || user.status !== "approved") return null;

    return {
      ...user,
      id: Number(user.id),
      permissions: user.permissions ? JSON.parse(user.permissions) : null,
    };
  } catch (error) {
    console.error("Auth check failed:", error);
    return null;
  }
}

export interface RequireAuthOptions {
  requiredRole?: string | string[];
  requiredPermission?: string;
}

/**
 * Enforce authentication and role/permission checks server-side.
 * Rejects unauthenticated requests with 401 or forbidden with 403.
 */
export async function requireAuth(
  req?: NextRequest,
  options?: RequireAuthOptions
): Promise<{ user: any; errorResponse?: NextResponse }> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { status: "fail", message: "Unauthorized. Please log in to continue." },
        { status: 401 }
      ),
    };
  }

  if (options?.requiredRole) {
    const roles = Array.isArray(options.requiredRole)
      ? options.requiredRole
      : [options.requiredRole];
    if (!roles.includes(user.role) && user.role !== "admin") {
      return {
        user,
        errorResponse: NextResponse.json(
          { status: "fail", message: "Forbidden. Insufficient role permissions." },
          { status: 403 }
        ),
      };
    }
  }

  if (options?.requiredPermission && user.role !== "admin") {
    if (!user.permissions || !user.permissions[options.requiredPermission]) {
      return {
        user,
        errorResponse: NextResponse.json(
          { status: "fail", message: `Forbidden. Missing permission: ${options.requiredPermission}` },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}
