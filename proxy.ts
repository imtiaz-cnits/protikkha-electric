import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET =
  process.env.JWT_SECRET || "protikkha_electric_super_secret_jwt_key_2026_codenext_it";

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyJwtToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToUint8Array(signatureB64);

    const isValidSig = await crypto.subtle.verify(
      "HMAC",
      key,
      signature as BufferSource,
      data
    );
    if (!isValidSig) return false;

    const payloadBytes = base64UrlToUint8Array(payloadB64);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadJson);

    if (!payload || !payload.userId) return false;
    if (typeof payload.exp === "number") {
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSec) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes & static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico" ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  const isAuthenticated = token ? await verifyJwtToken(token) : false;

  // Login page: allow directly if not authenticated; if already authenticated, go to dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const res = NextResponse.next();
    if (token) {
      res.cookies.delete("token");
    }
    return res;
  }

  // Root path: redirect to dashboard if authenticated, otherwise straight to login
  if (pathname === "/") {
    const dest = isAuthenticated ? "/dashboard" : "/login";
    const res = NextResponse.redirect(new URL(dest, request.url));
    if (!isAuthenticated && token) {
      res.cookies.delete("token");
    }
    return res;
  }

  // Every protected route (/dashboard, /pos, /products, /reports, /settings, etc.)
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const res = NextResponse.redirect(loginUrl);
    if (token) {
      res.cookies.delete("token");
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};

