import { Pool } from "pg";
import crypto from "crypto";

// Initialize PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/edgeways_leads";

const pool = new Pool({
  connectionString,
});

// Initialize database tables and RLS policies (Supabase compatibility)
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS watched_locations (
      id UUID PRIMARY KEY,
      location TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY,
      company_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      incorporation_date DATE NOT NULL,
      postcode TEXT,
      address TEXT,
      sic_codes TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      next_contact_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Migrate existing 'ignored' status to 'lost' before changing constraint
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
        UPDATE leads SET status = 'lost' WHERE status = 'ignored';
      END IF;
    END
    $$;

    -- Add new columns for directors, category, and delivery date
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry_category TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS directors JSONB;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS delivery_date DATE;

    -- Drop old check constraint and recreate it with the new set of statuses (removing ignored)
    ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
    ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('new', 'printed', 'delivered', 'interested', 'meeting', 'quote', 'won', 'lost'));

    -- Enable Row Level Security (RLS) for RLS-first design / Supabase compatibility
    ALTER TABLE watched_locations ENABLE ROW LEVEL SECURITY;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'watched_locations' AND policyname = 'allow_all_watched_locations'
      ) THEN
        CREATE POLICY allow_all_watched_locations ON watched_locations FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END
    $$;

    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'allow_all_leads'
      ) THEN
        CREATE POLICY allow_all_leads ON leads FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END
    $$;
  `);

  // Backfill industry_category for existing leads
  try {
    const untaggedRes = await pool.query("SELECT id, sic_codes FROM leads WHERE industry_category IS NULL");
    if (untaggedRes.rows.length > 0) {
      console.log(`Backfilling industry categories for ${untaggedRes.rows.length} existing leads...`);
      for (const row of untaggedRes.rows) {
        const category = getIndustryCategory(row.sic_codes);
        await pool.query("UPDATE leads SET industry_category = $1 WHERE id = $2", [category, row.id]);
      }
    }
  } catch (err) {
    console.error("Failed to backfill industry categories:", err);
  }

  // Backfill directors for existing leads
  try {
    const undirectoredRes = await pool.query("SELECT id, company_number FROM leads WHERE directors IS NULL");
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (apiKey && undirectoredRes.rows.length > 0) {
      console.log(`Backfilling directors for ${undirectoredRes.rows.length} existing leads...`);
      for (const row of undirectoredRes.rows) {
        try {
          const chUrl = `https://api.company-information.service.gov.uk/company/${row.company_number}/officers`;
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
            const directors = items
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
            await pool.query("UPDATE leads SET directors = $1 WHERE id = $2", [JSON.stringify(directors), row.id]);
          }
          // Sleep briefly to respect Companies House rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Failed to backfill directors for company ${row.company_number}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("Failed to backfill directors:", err);
  }
}

// Trigger initialization and log outcome
initDb().then(() => {
  console.log("PostgreSQL database initialization and migrations completed successfully.");
}).catch((err) => {
  console.error("Failed to initialize PostgreSQL database tables:", err);
});

/**
 * Categorizes a comma-separated list of SIC codes into 6 industry buckets
 */
export function getIndustryCategory(sicCodesStr: string | null): string {
  if (!sicCodesStr) return "Retail / Hospitality / Everything Else";
  
  const codes = sicCodesStr.split(",")
    .map(c => c.trim().replace(/\D/g, ""))
    .filter(Boolean);
    
  if (codes.length === 0) return "Retail / Hospitality / Everything Else";

  for (const code of codes) {
    // Trades: Builders, plumbers, electricians, landscapers, roofing, etc.
    if (code.startsWith("41") || code.startsWith("42") || code.startsWith("43") || code === "81300") {
      return "Trades";
    }
    // Property: Estate agents, letting agents, property management etc.
    if (code.startsWith("68")) {
      return "Property";
    }
    // Professional Services: Accountants, consultants, surveyors, architects, engineers etc.
    if (code.startsWith("69") || code.startsWith("71") || code.startsWith("73") || code.startsWith("74") || code.startsWith("702")) {
      return "Professional Services";
    }
    // Recruitment & HR: recruitment agency, HR outsourcing
    if (code.startsWith("78")) {
      return "Recruitment & HR";
    }
    // Healthcare: Dentists, therapists, clinics, care providers, etc.
    if (code.startsWith("86") || code.startsWith("87") || code.startsWith("88")) {
      return "Healthcare";
    }
  }

  return "Retail / Hospitality / Everything Else";
}

/**
 * Generates a UUID v7 compliant string.
 */
export function generateUUIDv7(): string {
  const timestamp = Date.now();
  const tsHex = timestamp.toString(16).padStart(12, '0');
  
  const randomBytes = crypto.randomBytes(10);
  
  const part1 = tsHex.substring(0, 8);
  const part2 = tsHex.substring(8, 12);
  
  // Set version 7 (0111) in the high 4 bits of the 3rd group
  const val3 = ((randomBytes[0] << 8) | randomBytes[1]) & 0x0fff;
  const part3 = '7' + val3.toString(16).padStart(3, '0');
  
  // Set variant 2 (10xx) in the high 2 bits of the 4th group
  const val4 = (randomBytes[2] & 0x3f) | 0x80;
  const part4 = val4.toString(16).padStart(2, '0') + randomBytes[3].toString(16).padStart(2, '0');
  
  const part5 = randomBytes.subarray(4, 10).toString('hex');
  
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

// Interfaces
export interface WatchedLocation {
  id: string;
  location: string;
  created_at: string;
}

export interface Lead {
  id: string;
  company_number: string;
  name: string;
  incorporation_date: string;
  postcode: string | null;
  address: string | null;
  sic_codes: string | null;
  industry_category: string | null;
  directors: { name: string; address: string }[] | null;
  status: 'new' | 'printed' | 'delivered' | 'interested' | 'meeting' | 'quote' | 'won' | 'lost';
  notes: string | null;
  next_contact_date: string | null;
  delivery_date: string | null;
  created_at: string;
}

// DB Operations

// --- Watched Locations ---
export async function getWatchedLocations(): Promise<WatchedLocation[]> {
  try {
    const res = await pool.query(
      "SELECT id, location, created_at::text FROM watched_locations ORDER BY location ASC"
    );
    return res.rows as WatchedLocation[];
  } catch (error) {
    console.error("Error fetching watched locations:", error);
    return [];
  }
}

export async function addWatchedLocation(location: string): Promise<WatchedLocation> {
  const id = generateUUIDv7();
  const trimmed = location.trim().toUpperCase();
  try {
    await pool.query(
      "INSERT INTO watched_locations (id, location) VALUES ($1, $2)",
      [id, trimmed]
    );
    
    const res = await pool.query(
      "SELECT id, location, created_at::text FROM watched_locations WHERE id = $1",
      [id]
    );
    return res.rows[0] as WatchedLocation;
  } catch (error) {
    console.error(`Error adding watched location ${trimmed}:`, error);
    throw error;
  }
}

export async function deleteWatchedLocation(id: string): Promise<void> {
  try {
    await pool.query("DELETE FROM watched_locations WHERE id = $1", [id]);
  } catch (error) {
    console.error(`Error deleting watched location ${id}:`, error);
    throw error;
  }
}

// --- Leads ---
export async function getLeads(): Promise<Lead[]> {
  try {
    const res = await pool.query(
      "SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, industry_category, directors, status, notes, next_contact_date::text, delivery_date::text, created_at::text FROM leads ORDER BY incorporation_date DESC, created_at DESC"
    );
    
    return res.rows.map(row => ({
      ...row,
      directors: typeof row.directors === "string" ? JSON.parse(row.directors) : row.directors
    })) as Lead[];
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

export async function saveLead(lead: Omit<Lead, "id" | "created_at" | "status" | "notes" | "next_contact_date" | "delivery_date">): Promise<Lead> {
  const id = generateUUIDv7();
  try {
    await pool.query(
      `
      INSERT INTO leads (id, company_number, name, incorporation_date, postcode, address, sic_codes, industry_category, directors, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new')
      ON CONFLICT(company_number) DO UPDATE SET
        name = EXCLUDED.name,
        incorporation_date = EXCLUDED.incorporation_date,
        postcode = EXCLUDED.postcode,
        address = EXCLUDED.address,
        sic_codes = EXCLUDED.sic_codes,
        industry_category = EXCLUDED.industry_category,
        directors = EXCLUDED.directors
      `,
      [
        id,
        lead.company_number,
        lead.name,
        lead.incorporation_date,
        lead.postcode,
        lead.address,
        lead.sic_codes,
        lead.industry_category,
        lead.directors ? JSON.stringify(lead.directors) : null
      ]
    );

    const res = await pool.query(
      "SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, industry_category, directors, status, notes, next_contact_date::text, delivery_date::text, created_at::text FROM leads WHERE company_number = $1",
      [lead.company_number]
    );
    
    const row = res.rows[0];
    if (row) {
      row.directors = typeof row.directors === "string" ? JSON.parse(row.directors) : row.directors;
    }
    return row as Lead;
  } catch (error) {
    console.error(`Error saving lead ${lead.company_number}:`, error);
    throw error;
  }
}

export async function updateLead(id: string, updates: { status?: Lead["status"]; notes?: string | null; next_contact_date?: string | null; delivery_date?: string | null }): Promise<Lead> {
  const fields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    params.push(updates.status);
  }

  if (updates.notes !== undefined) {
    fields.push(`notes = $${paramIndex++}`);
    params.push(updates.notes);
  }

  if (updates.next_contact_date !== undefined) {
    fields.push(`next_contact_date = $${paramIndex++}`);
    params.push(updates.next_contact_date || null);
  }

  if (updates.delivery_date !== undefined) {
    fields.push(`delivery_date = $${paramIndex++}`);
    params.push(updates.delivery_date || null);
  }

  if (fields.length > 0) {
    params.push(id);
    const sql = `UPDATE leads SET ${fields.join(", ")} WHERE id = $${paramIndex}`;
    try {
      await pool.query(sql, params);
    } catch (error) {
      console.error(`Error updating lead ${id}:`, error);
      throw error;
    }
  }

  try {
    const res = await pool.query(
      "SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, industry_category, directors, status, notes, next_contact_date::text, delivery_date::text, created_at::text FROM leads WHERE id = $1",
      [id]
    );
    const row = res.rows[0];
    if (row) {
      row.directors = typeof row.directors === "string" ? JSON.parse(row.directors) : row.directors;
    }
    return row as Lead;
  } catch (error) {
    console.error(`Error fetching updated lead ${id}:`, error);
    throw error;
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    await pool.query("DELETE FROM leads WHERE id = $1", [id]);
  } catch (error) {
    console.error(`Error deleting lead ${id}:`, error);
    throw error;
  }
}
