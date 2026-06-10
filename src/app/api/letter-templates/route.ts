import { NextRequest, NextResponse } from "next/server";
import { getLetterTemplates } from "@/lib/db";

export async function GET() {
  try {
    const templates = await getLetterTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET /api/letter-templates error:", error);
    return NextResponse.json({ error: "Failed to fetch letter templates" }, { status: 500 });
  }
}
