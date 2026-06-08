import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public paths that don't need auth
  const isPublicPath = path === "/login" || path === "/api/auth/login";

  // Get the session token from cookies
  const token = request.cookies.get("edgeways_session")?.value;

  // If it's a public path and the user has a valid token, redirect to home
  if (isPublicPath && token === "authenticated") {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // If it's a protected path and the user has no token, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return NextResponse.next();
}

// Match all paths except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login (auth API)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - stuart.jpg (Stuart image)
     * - stuart.png (Stuart image fallback)
     */
    "/((?!api/auth/login|_next/static|_next/image|favicon.ico|stuart.jpg|stuart.png).*)",
  ],
};
