import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublicPath = path === "/login" || path === "/api/auth/login";
  const token = request.cookies.get("edgeways_session")?.value;
  const isAuthenticated = token === "authenticated";

  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  if (!isPublicPath && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth/login|_next/static|_next/image|favicon.ico|stuart.jpg).*)",
  ],
};