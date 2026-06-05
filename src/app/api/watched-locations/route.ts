import { NextRequest, NextResponse } from "next/server";
import { getWatchedLocations, addWatchedLocation, deleteWatchedLocation } from "@/lib/db";

export async function GET() {
  try {
    const locations = getWatchedLocations();
    return NextResponse.json(locations);
  } catch (error) {
    console.error("GET /api/watched-locations error:", error);
    return NextResponse.json({ error: "Failed to fetch watched locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location } = body;
    
    if (!location || typeof location !== "string" || location.trim() === "") {
      return NextResponse.json({ error: "A valid location is required" }, { status: 400 });
    }
    
    const newLoc = addWatchedLocation(location);
    return NextResponse.json(newLoc, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/watched-locations error:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "This location is already being watched" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add watched location" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Location ID parameter is required" }, { status: 400 });
    }
    
    deleteWatchedLocation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/watched-locations error:", error);
    return NextResponse.json({ error: "Failed to delete watched location" }, { status: 500 });
  }
}
