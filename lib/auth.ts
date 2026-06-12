import jwt from "jsonwebtoken";

export const cookieName = process.env.COOKIE_NAME ?? "expectocrm_token";
export const jwtSecret = process.env.JWT_SECRET ?? "replace-with-a-long-random-secret";
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

export type AuthTokenPayload = {
  id: string;
  role: "admin" | "employee";
  name: string;
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, jwtSecret) as AuthTokenPayload;
}

/** Parse a JWT expiry string like "7d", "24h", "30m" into seconds */
function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}

export function authCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAge = parseExpiryToSeconds(jwtExpiresIn as string);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge, // keeps cookie alive across browser restarts & background tabs
  };
}
