import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    // Validate credentials against environment variables with default fallback
    const expectedUsername = process.env.AUTH_USERNAME || "rdtzn1";
    const expectedPassword = process.env.AUTH_PASSWORD || "supersecretpassword";

    if (username === expectedUsername && password === expectedPassword) {
      const response = NextResponse.json({ success: true });
      
      const isSecure = req.nextUrl.protocol === "https:" || 
                       req.headers.get("x-forwarded-proto") === "https" || 
                       (process.env.APP_URL?.startsWith("https://") ?? false);

      // Set session cookie with exactly 8 hours expiration (28,800 seconds)
      response.cookies.set("edgeways_session", "authenticated", {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
