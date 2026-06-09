import { NextRequest, NextResponse } from "next/server";
import { getLeads, saveLead, updateLead, deleteLead, getIndustryCategory } from "@/lib/db";

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json(leads);
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_number, name, incorporation_date, postcode, address, sic_codes, status } = body;
    
    if (!company_number || !name || !incorporation_date) {
      return NextResponse.json({ error: "Missing required lead fields (company_number, name, incorporation_date)" }, { status: 400 });
    }
    
    // Fetch director names and addresses from Companies House API
    let directors: { name: string; address: string }[] = [];
    try {
      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      if (apiKey) {
        const chUrl = `https://api.company-information.service.gov.uk/company/${company_number}/officers`;
        const authHeader = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;
        const response = await fetch(chUrl, {
          method: "GET",
          headers: {
            "Authorization": authHeader,
            "Accept": "application/json"
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const items = data.items || [];
          
          directors = items
            .filter((item: any) => {
              const isDirector = item.officer_role === "director" || item.officer_role?.includes("director");
              const isActive = !item.resigned_on;
              return isDirector && isActive;
            })
            .map((item: any) => {
              const addressObj = item.address || {};
              const addressParts = [
                addressObj.premises,
                addressObj.address_line_1,
                addressObj.address_line_2,
                addressObj.locality,
                addressObj.region,
                addressObj.postal_code,
                addressObj.country
              ].filter(Boolean);
              return {
                name: item.name || "Unknown Director",
                address: addressParts.join(", ") || "No address provided"
              };
            });
        }
      }
    } catch (err) {
      console.error("Failed to fetch directors in POST /api/leads:", err);
    }

    // Compute industry category based on SIC code
    const industry_category = getIndustryCategory(sic_codes || null);

    const saved = await saveLead({
      company_number,
      name,
      incorporation_date,
      postcode: postcode || null,
      address: address || null,
      sic_codes: sic_codes || null,
      industry_category,
      directors,
      status: status || 'new'
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
    const { 
      id, status, notes, next_contact_date, delivery_date,
      base_version, category_variant, full_template_key, offer_price,
      printed_date, first_response_date, first_call_date, meeting_booked_date,
      meeting_completed_date, proposal_sent_date, follow_up_sent_date, won_date,
      lost_date, not_suitable_date, no_response_date, outcome_reason, outcome_reason_other,
      phone, email, contact_name
    } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }
    
    const validStatuses = [
      'new', 'printed', 'delivered', 'responded', 'first_call', 'meeting_booked', 
      'meeting_completed', 'proposal_sent', 'follow_up_sent', 'won', 'lost', 
      'not_suitable', 'no_response'
    ];
    
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid lead status" }, { status: 400 });
    }
    
    const updated = await updateLead(id, {
      status,
      notes,
      next_contact_date,
      delivery_date,
      base_version,
      category_variant,
      full_template_key,
      offer_price,
      printed_date,
      first_response_date,
      first_call_date,
      meeting_booked_date,
      meeting_completed_date,
      proposal_sent_date,
      follow_up_sent_date,
      won_date,
      lost_date,
      not_suitable_date,
      no_response_date,
      outcome_reason,
      outcome_reason_other,
      phone,
      email,
      contact_name
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
    
    await deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/leads error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
