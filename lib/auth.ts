import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "yazkap-fallback-secret-change-in-production"
);
const COOKIE = "yazkap_session";

export type SessionUser = {
  id: number;
  email: string;
  role: "admin" | "tenant" | "landlord" | "employee";
  full_name: string | null;
  approved: boolean;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// Added for API route authentication
export async function checkSession(): Promise<SessionUser | null> {
  return getSession();
}

export async function checkAdmin(session?: SessionUser | null): Promise<boolean> {
  // If session is provided, use it; otherwise get it from cookies
  const currentSession = session || await getSession();
  return currentSession?.role === "admin";
}

export { COOKIE };