import { NextRequest, NextResponse } from "next/server";
import { getLeads, getIndustryCategory } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");
    const incorporatedFrom = searchParams.get("incorporated_from");
    
    if (!location || location.trim() === "") {
      return NextResponse.json({ error: "Location parameter is required" }, { status: 400 });
    }
    
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      console.error("COMPANIES_HOUSE_API_KEY env variable is not set");
      return NextResponse.json({ error: "Companies House API key is not configured on the server" }, { status: 500 });
    }
    
    // Construct Companies House Advanced Search URL
    const chUrl = new URL("https://api.company-information.service.gov.uk/advanced-search/companies");
    chUrl.searchParams.append("location", location.trim());
    chUrl.searchParams.append("company_status", "active");
    chUrl.searchParams.append("size", "100");
    
    if (incorporatedFrom) {
      chUrl.searchParams.append("incorporated_from", incorporatedFrom);
    }
    
    // Auth header: Basic Auth with API key as username, empty password
    const authHeader = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;
    
    const response = await fetch(chUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json"
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Companies House API responded with status ${response.status} for location ${location}:`, errorText);
      return NextResponse.json(
        { error: `Companies House API error: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Get locally saved leads to decorate search results
    const savedLeads = await getLeads();
    const leadsMap = new Map(savedLeads.map(l => [l.company_number, l]));
    
    const items = data.items || [];
    const decoratedItems = items.map((item: any) => {
      const companyNumber = item.company_number;
      const localLead = leadsMap.get(companyNumber);
      
      const address = item.registered_office_address || {};
      const postcode = address.postal_code || null;
      
      const addressParts = [
        address.premises,
        address.address_line_1,
        address.address_line_2,
        address.locality,
        address.region,
        address.postal_code,
        address.country
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");
      const sicCodesStr = item.sic_codes ? item.sic_codes.join(", ") : null;
      const industry_category = getIndustryCategory(sicCodesStr);
      
      return {
        company_number: companyNumber,
        name: item.company_name,
        incorporation_date: item.date_of_creation,
        postcode,
        address: fullAddress,
        sic_codes: sicCodesStr,
        industry_category,
        is_saved: !!localLead,
        lead_id: localLead ? localLead.id : null,
        lead_status: localLead ? localLead.status : null,
        lead_notes: localLead ? localLead.notes : null,
        lead_next_contact_date: localLead ? localLead.next_contact_date : null
      };
    });
    
    return NextResponse.json({ items: decoratedItems });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to perform company search" }, { status: 500 });
  }
}
