export const env = {
  cookieName: process.env.COOKIE_NAME ?? "expectocrm_token",
  jwtSecret: process.env.JWT_SECRET ?? "replace-with-a-long-random-secret",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_URL ?? "crm-expecto.vercel.app"}`,
};
