import { NextRequest, NextResponse } from "next/server";
import { getLeads, saveLead, updateLead, deleteLead } from "@/lib/db";

export async function GET() {
  try {
    const leads = getLeads();
    return NextResponse.json(leads);
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_number, name, incorporation_date, postcode, address, sic_codes } = body;
    
    if (!company_number || !name || !incorporation_date) {
      return NextResponse.json({ error: "Missing required lead fields (company_number, name, incorporation_date)" }, { status: 400 });
    }
    
    const saved = saveLead({
      company_number,
      name,
      incorporation_date,
      postcode: postcode || null,
      address: address || null,
      sic_codes: sic_codes || null
    });
    
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes, next_contact_date } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }
    
    if (status !== undefined && !['new', 'contacted', 'interested', 'ignored'].includes(status)) {
      return NextResponse.json({ error: "Invalid lead status" }, { status: 400 });
    }
    
    const updated = updateLead(id, {
      status,
      notes,
      next_contact_date
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/leads error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }
    
    deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/leads error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
