import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { adminClient } from "@ambo/database/admin-client";
import { getSession } from "@/lib/session";

/**
 * Authorization for the public ambassador-application flow.
 *
 * Applications are keyed by phone number and can be started by guests (no
 * account), so phone alone must never grant access to an existing
 * application. Instead, when an application is first created we mint a
 * signed "application token" scoped to that phone:
 *
 *  - web guests carry it in an httpOnly cookie (set by the server action)
 *  - the mobile app receives it in the create response and sends it back
 *    in the x-application-token header
 *
 * Access to an existing application requires one of:
 *  1. an admin/superadmin session
 *  2. a session whose users.phone matches the application's phone
 *  3. a valid application token for that phone
 */

const APPLICATION_COOKIE = "ambo_application";
const APPLICATION_TOKEN_HEADER = "x-application-token";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days — matches the session cookie

export const PHONE_REGEX = /^\d{10}$/;

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET or AUTH_SECRET environment variable must be set"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createApplicationToken(phone: string): Promise<string> {
  // The scope claim prevents replaying this token as an ambo_session JWT
  // (which requires userId/role) and vice versa.
  return new SignJWT({ scope: "application", phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyApplicationToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.scope !== "application") return null;
    const phone = payload.phone;
    if (typeof phone !== "string" || !phone) return null;
    return phone;
  } catch {
    return null;
  }
}

export async function setApplicationCookie(phone: string): Promise<string> {
  const token = await createApplicationToken(phone);
  const cookieStore = await cookies();
  cookieStore.set(APPLICATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return token;
}

/** Phone authorized by the application token in the cookie or header, if any. */
async function getTokenPhone(): Promise<string | null> {
  try {
    const headerStore = await headers();
    const headerToken = headerStore.get(APPLICATION_TOKEN_HEADER);
    if (headerToken) {
      const phone = await verifyApplicationToken(headerToken);
      if (phone) return phone;
    }
  } catch {
    // headers() unavailable outside a request context
  }
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(APPLICATION_COOKIE)?.value;
    if (cookieToken) {
      return verifyApplicationToken(cookieToken);
    }
  } catch {
    // cookies() unavailable outside a request context
  }
  return null;
}

/**
 * True if the current request may read/modify the application for `phone`.
 */
export async function canAccessApplication(phone: string): Promise<boolean> {
  if (!phone) return false;

  const session = await getSession().catch(() => null);
  if (session) {
    if (session.role === "admin" || session.role === "superadmin") return true;
    const { data: user } = await adminClient
      .from("users")
      .select("phone")
      .eq("id", session.userId)
      .single();
    if (user?.phone === phone) return true;
  }

  const tokenPhone = await getTokenPhone();
  return tokenPhone === phone;
}

/** True if an application row already exists for `phone`. */
export async function applicationExists(phone: string): Promise<boolean> {
  const { data } = await adminClient
    .from("applications")
    .select("id")
    .eq("phone_number", phone)
    .maybeSingle();
  return !!data;
}

export { APPLICATION_COOKIE, APPLICATION_TOKEN_HEADER };
