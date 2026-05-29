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

export function authCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
  };
}
