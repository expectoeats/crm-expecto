import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const cookieName = process.env.COOKIE_NAME ?? "expectocrm_token";
const jwtSecret = process.env.JWT_SECRET ?? "replace-with-a-long-random-secret";

function getAuthPayload(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, jwtSecret) as { role?: string };
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/login");
  const isAdmin = pathname.startsWith("/admin");
  const isEmployee = pathname.startsWith("/dashboard") || pathname.startsWith("/leads");
  const token = getAuthPayload(request);

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!token) {
    if (isLogin) {
      return NextResponse.next();
    }

    if (isAdmin || isEmployee) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (token?.role === "admin" && isEmployee) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (token?.role === "employee" && isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (token && isLogin) {
    return NextResponse.redirect(new URL(token.role === "admin" ? "/admin/dashboard" : "/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
