import { cookies } from "next/headers";
import {
  getUserWithContext,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./store";

export const SESSION_COOKIE_NAME = "dv_token";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const ctx = getUserWithContext(payload.userId);
  if (!ctx) return null;
  return {
    session: payload,
    ...ctx,
  };
}

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const token = signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  });
  return token;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
