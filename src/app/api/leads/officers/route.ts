import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyNumber = searchParams.get("company_number");
    
    if (!companyNumber) {
      return NextResponse.json({ error: "company_number query parameter is required" }, { status: 400 });
    }
    
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      console.error("COMPANIES_HOUSE_API_KEY env variable is not set");
      return NextResponse.json({ error: "Companies House API key is not configured on the server" }, { status: 500 });
    }
    
    const chUrl = `https://api.company-information.service.gov.uk/company/${companyNumber}/officers`;
    const authHeader = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;
    
    const response = await fetch(chUrl, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json"
      }
    });
    
    if (!response.ok) {
      // If company has no officers or not found, return empty gracefully
      if (response.status === 404) {
        return NextResponse.json({ director: null });
      }
      const errText = await response.text();
      console.error(`Companies House officers API failed with status ${response.status}:`, errText);
      return NextResponse.json({ error: `API error: ${response.status}` }, { status: response.status });
    }
    
    const data = await response.json();
    const items = data.items || [];
    
    // Find the first active director
    const activeDirector = items.find((item: any) => {
      const isDirector = item.officer_role === "director" || item.officer_role?.includes("director");
      const isActive = !item.resigned_on;
      return isDirector && isActive;
    });
    
    if (!activeDirector || !activeDirector.name) {
      return NextResponse.json({ director: null });
    }
    
    const parsed = parseDirectorName(activeDirector.name);
    return NextResponse.json({ director: parsed });
  } catch (error) {
    console.error("GET /api/leads/officers error:", error);
    return NextResponse.json({ error: "Failed to fetch company officers" }, { status: 500 });
  }
}

/**
 * Parses Companies House name format "LASTNAME, Firstname Middlename"
 * and formats casing nicely (e.g. "SMITH, JOHN ADAM" -> FirstName: "John", LastName: "Smith")
 */
function parseDirectorName(rawName: string) {
  if (!rawName) return null;
  
  const parts = rawName.split(",");
  
  const capitalize = (str: string) => {
    if (!str) return "";
    // Handle double-barreled names like "Smith-Jones" or "de Vere"
    return str
      .toLowerCase()
      .split("-")
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join("-")
      .split(" ")
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  if (parts.length < 2) {
    const nameParts = rawName.trim().split(" ");
    const first = capitalize(nameParts[0]);
    const last = nameParts.length > 1 ? capitalize(nameParts[nameParts.length - 1]) : "";
    return {
      firstName: first,
      lastName: last,
      fullName: capitalize(rawName.trim())
    };
  }
  
  const lastName = capitalize(parts[0].trim());
  const firstAndMiddles = parts[1].trim();
  const firstAndMiddlesParts = firstAndMiddles.split(" ");
  const firstName = capitalize(firstAndMiddlesParts[0]);
  
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim()
  };
}
