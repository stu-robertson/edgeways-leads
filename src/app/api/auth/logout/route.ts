import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  const isSecure = req.nextUrl.protocol === "https:" || 
                   req.headers.get("x-forwarded-proto") === "https" || 
                   (process.env.APP_URL?.startsWith("https://") ?? false);

  // Clear the session cookie by setting its expiration to the past
  response.cookies.set("edgeways_session", "", {
    httpOnly: true,
    secure: isSecure,
    expires: new Date(0),
    path: "/",
  });
  
  return response;
}
