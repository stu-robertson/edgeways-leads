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

    -- Add tracking columns for template versions and funnel dates
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS base_version TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS category_variant TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS full_template_key TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS offer_price INTEGER DEFAULT 300;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS printed_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_response_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_call_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS meeting_booked_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS meeting_completed_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS proposal_sent_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_sent_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS not_suitable_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS no_response_date DATE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS outcome_reason TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS outcome_reason_other TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_name TEXT;

    -- Migrate old statuses to new statuses
    UPDATE leads SET status = 'responded' WHERE status = 'interested';
    UPDATE leads SET status = 'meeting_booked' WHERE status = 'meeting';
    UPDATE leads SET status = 'proposal_sent' WHERE status = 'quote';

    -- Auto-set historical dates to keep analytics aligned for old leads
    UPDATE leads SET won_date = COALESCE(delivery_date, created_at::date) WHERE status = 'won' AND won_date IS NULL;
    UPDATE leads SET lost_date = COALESCE(delivery_date, created_at::date) WHERE status = 'lost' AND lost_date IS NULL;
    UPDATE leads SET printed_date = created_at::date WHERE status IN ('printed', 'delivered', 'responded', 'first_call', 'meeting_booked', 'meeting_completed', 'proposal_sent', 'follow_up_sent', 'won', 'lost') AND printed_date IS NULL;
    UPDATE leads SET delivery_date = created_at::date WHERE status IN ('delivered', 'responded', 'first_call', 'meeting_booked', 'meeting_completed', 'proposal_sent', 'follow_up_sent', 'won', 'lost') AND delivery_date IS NULL;

    -- Drop old check constraint and recreate it with the new set of 13 statuses
    ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
    ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('new', 'printed', 'delivered', 'responded', 'first_call', 'meeting_booked', 'meeting_completed', 'proposal_sent', 'follow_up_sent', 'won', 'lost', 'not_suitable', 'no_response'));

    -- Create milestones table
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      metric TEXT NOT NULL,
      target_value NUMERIC NOT NULL,
      reward TEXT,
      completed_date TIMESTAMPTZ,
      celebration_notes TEXT
    );

    ALTER TABLE milestones ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

    -- Enable RLS for milestones
    ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'milestones' AND policyname = 'allow_all_milestones'
      ) THEN
        CREATE POLICY allow_all_milestones ON milestones FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END
    $$;

    -- Seed the initial milestones
    INSERT INTO milestones (id, title, type, metric, target_value, reward) VALUES
      ('letters_delivered_100', '100 Letters Delivered', 'activity', 'letters_delivered', 100, 'Team dinner'),
      ('follow_ups_sent_50', '50 Follow-ups Sent', 'activity', 'follow_ups_sent', 50, 'Friday early finish'),
      ('first_enquiry', 'First Enquiry', 'conversion', 'first_enquiry', 1, 'Celebrate with coffee'),
      ('first_meeting', 'First Meeting', 'conversion', 'first_meeting', 1, 'Nice lunch'),
      ('first_proposal', 'First Proposal', 'conversion', 'first_proposal', 1, 'Team drinks'),
      ('first_client', 'First Client', 'conversion', 'first_client', 1, 'Bottle of champagne!'),
      ('total_revenue_1000', '£1,000 Total Revenue', 'revenue', 'total_revenue', 1000, 'Bonus reward'),
      ('mrr_500', '£500 Monthly Recurring Revenue', 'revenue', 'mrr', 500, 'Company celebration'),
      ('first_trades_client', 'First Trades Client', 'category', 'first_trades_client', 1, 'Trade sector unlock reward'),
      ('first_professional_services_client', 'First Professional Services Client', 'category', 'first_professional_services_client', 1, 'Professional sector unlock reward'),
      ('first_software_project', 'First Software Project', 'category', 'first_software_project', 1, 'Software sector unlock reward')
    ON CONFLICT (id) DO NOTHING;

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
    const validCategories = [
      "Local Trades",
      "Professional Services",
      "Health & Wellness",
      "Hospitality & Food",
      "Retail & Ecommerce",
      "Property & Construction",
      "Manufacturing & Engineering",
      "Transport & Logistics",
      "Education & Training",
      "Creative & Media",
      "Technology",
      "Other Local Services"
    ];
    const untaggedRes = await pool.query(
      "SELECT id, sic_codes FROM leads WHERE industry_category IS NULL OR industry_category NOT IN (SELECT unnest($1::text[]))",
      [validCategories]
    );
    if (untaggedRes.rows.length > 0) {
      console.log(`Re-classifying industry categories for ${untaggedRes.rows.length} existing leads into 12-category schema...`);
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
 * Categorizes a comma-separated list of SIC codes into 12 industry buckets
 */
export function getIndustryCategory(sicCodesStr: string | null): string {
  if (!sicCodesStr) return "Other Local Services";
  
  const codes = sicCodesStr.split(",")
    .map(c => c.trim().replace(/\D/g, ""))
    .filter(Boolean);
    
  if (codes.length === 0) return "Other Local Services";

  for (const code of codes) {
    // 11. Technology
    if (code.startsWith("62") || code.startsWith("63") || code.startsWith("26")) {
      return "Technology";
    }
    // 1. Local Trades
    if (code.startsWith("41") || code.startsWith("42") || code.startsWith("43") || code === "81300") {
      return "Local Trades";
    }
    // 6. Property & Construction
    if (code.startsWith("68")) {
      return "Property & Construction";
    }
    // 2. Professional Services
    if (
      code.startsWith("69") || 
      code.startsWith("70") || 
      code.startsWith("71") || 
      code.startsWith("73") || 
      code.startsWith("74") || 
      code.startsWith("64") || 
      code.startsWith("65") || 
      code.startsWith("66") || 
      code.startsWith("75")
    ) {
      // Some exceptions in 74 like photography or design can go to Creative & Media
      if (code.startsWith("741") || code.startsWith("742")) {
        return "Creative & Media";
      }
      return "Professional Services";
    }
    // 3. Health & Wellness
    if (
      code.startsWith("86") || 
      code.startsWith("87") || 
      code.startsWith("88") || 
      code.startsWith("93") || 
      code.startsWith("9601") || 
      code.startsWith("9602") || 
      code.startsWith("9604")
    ) {
      return "Health & Wellness";
    }
    // 4. Hospitality & Food
    if (code.startsWith("55") || code.startsWith("56")) {
      return "Hospitality & Food";
    }
    // 5. Retail & Ecommerce
    if (code.startsWith("46") || code.startsWith("47")) {
      return "Retail & Ecommerce";
    }
    // 7. Manufacturing & Engineering
    const code2 = parseInt(code.substring(0, 2), 10);
    if (!isNaN(code2) && code2 >= 10 && code2 <= 33) {
      return "Manufacturing & Engineering";
    }
    // 8. Transport & Logistics
    if (
      code.startsWith("49") || 
      code.startsWith("50") || 
      code.startsWith("51") || 
      code.startsWith("52") || 
      code.startsWith("53") || 
      code.startsWith("45")
    ) {
      return "Transport & Logistics";
    }
    // 9. Education & Training
    if (code.startsWith("85")) {
      return "Education & Training";
    }
    // 10. Creative & Media
    if (
      code.startsWith("90") || 
      code.startsWith("91") || 
      code.startsWith("59") || 
      code.startsWith("60")
    ) {
      return "Creative & Media";
    }
  }

  return "Other Local Services";
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
  status: 'new' | 'printed' | 'delivered' | 'responded' | 'first_call' | 'meeting_booked' | 'meeting_completed' | 'proposal_sent' | 'follow_up_sent' | 'won' | 'lost' | 'not_suitable' | 'no_response';
  notes: string | null;
  next_contact_date: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  delivery_date: string | null;
  base_version: string | null;
  category_variant: string | null;
  full_template_key: string | null;
  offer_price: number | null;
  printed_date: string | null;
  first_response_date: string | null;
  first_call_date: string | null;
  meeting_booked_date: string | null;
  meeting_completed_date: string | null;
  proposal_sent_date: string | null;
  follow_up_sent_date: string | null;
  won_date: string | null;
  lost_date: string | null;
  not_suitable_date: string | null;
  no_response_date: string | null;
  outcome_reason: string | null;
  outcome_reason_other: string | null;
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
      `SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, industry_category, directors, status, notes, 
              next_contact_date::text, phone, email, contact_name, delivery_date::text, base_version, category_variant, full_template_key, offer_price,
              printed_date::text, first_response_date::text, first_call_date::text, meeting_booked_date::text, meeting_completed_date::text, 
              proposal_sent_date::text, follow_up_sent_date::text, won_date::text, lost_date::text, not_suitable_date::text, no_response_date::text,
              outcome_reason, outcome_reason_other, created_at::text 
       FROM leads ORDER BY incorporation_date DESC, created_at DESC`
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

export interface SaveLeadInput {
  company_number: string;
  name: string;
  incorporation_date: string;
  postcode: string | null;
  address: string | null;
  sic_codes: string | null;
  industry_category: string | null;
  directors: { name: string; address: string }[] | null;
  status?: Lead["status"];
}

export async function saveLead(lead: SaveLeadInput): Promise<Lead> {
  const id = generateUUIDv7();
  try {
    await pool.query(
      `
      INSERT INTO leads (id, company_number, name, incorporation_date, postcode, address, sic_codes, industry_category, directors, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT(company_number) DO UPDATE SET
        name = EXCLUDED.name,
        incorporation_date = EXCLUDED.incorporation_date,
        postcode = EXCLUDED.postcode,
        address = EXCLUDED.address,
        sic_codes = EXCLUDED.sic_codes,
        industry_category = EXCLUDED.industry_category,
        directors = EXCLUDED.directors,
        status = COALESCE(NULLIF(EXCLUDED.status, 'new'), leads.status)
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
        lead.directors ? JSON.stringify(lead.directors) : null,
        lead.status || 'new'
      ]
    );

    const res = await pool.query(
      "SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, industry_category, directors, status, notes, next_contact_date::text, phone, email, contact_name, delivery_date::text, created_at::text FROM leads WHERE company_number = $1",
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

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const fields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const allowedKeys = [
    "status", "notes", "next_contact_date", "phone", "email", "contact_name", "delivery_date",
    "base_version", "category_variant", "full_template_key", "offer_price",
    "printed_date", "first_response_date", "first_call_date", "meeting_booked_date",
    "meeting_completed_date", "proposal_sent_date", "follow_up_sent_date", "won_date",
    "lost_date", "not_suitable_date", "no_response_date", "outcome_reason", "outcome_reason_other"
  ];

  for (const key of allowedKeys) {
    if (updates[key as keyof typeof updates] !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      params.push(updates[key as keyof typeof updates] ?? null);
    }
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
      `SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, industry_category, directors, status, notes, 
              next_contact_date::text, phone, email, contact_name, delivery_date::text, base_version, category_variant, full_template_key, offer_price,
              printed_date::text, first_response_date::text, first_call_date::text, meeting_booked_date::text, meeting_completed_date::text, 
              proposal_sent_date::text, follow_up_sent_date::text, won_date::text, lost_date::text, not_suitable_date::text, no_response_date::text,
              outcome_reason, outcome_reason_other, created_at::text 
       FROM leads WHERE id = $1`,
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

// --- Milestones ---
export interface Milestone {
  id: string;
  title: string;
  type: 'activity' | 'conversion' | 'revenue' | 'category';
  metric: string;
  target_value: number;
  current_value?: number;
  reward: string | null;
  completed_date: string | null;
  celebration_notes: string | null;
  archived?: boolean;
}

export async function getMilestones(): Promise<Milestone[]> {
  try {
    const res = await pool.query(
      "SELECT id, title, type, metric, target_value::float as target_value, reward, completed_date::text, celebration_notes, archived FROM milestones ORDER BY type ASC, target_value ASC"
    );
    return res.rows as Milestone[];
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return [];
  }
}

export async function updateMilestone(
  id: string,
  completed_date: string | null,
  celebration_notes: string | null,
  archived?: boolean
): Promise<Milestone> {
  try {
    await pool.query(
      `UPDATE milestones 
       SET completed_date = $1, celebration_notes = $2, archived = COALESCE($3, archived)
       WHERE id = $4`,
      [completed_date || null, celebration_notes || null, archived === undefined ? null : archived, id]
    );

    const res = await pool.query(
      "SELECT id, title, type, metric, target_value::float as target_value, reward, completed_date::text, celebration_notes, archived FROM milestones WHERE id = $1",
      [id]
    );
    return res.rows[0] as Milestone;
  } catch (error) {
    console.error(`Error updating milestone ${id}:`, error);
    throw error;
  }
}

export async function saveMilestone(m: Milestone): Promise<Milestone> {
  try {
    const checkRes = await pool.query("SELECT id FROM milestones WHERE id = $1", [m.id]);
    if (checkRes.rows.length > 0) {
      // Update
      await pool.query(
        `UPDATE milestones
         SET title = $1, type = $2, metric = $3, target_value = $4, reward = $5, completed_date = $6, celebration_notes = $7, archived = $8
         WHERE id = $9`,
        [m.title, m.type, m.metric, m.target_value, m.reward, m.completed_date || null, m.celebration_notes || null, m.archived || false, m.id]
      );
    } else {
      // Insert
      await pool.query(
        `INSERT INTO milestones (id, title, type, metric, target_value, reward, completed_date, celebration_notes, archived)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [m.id, m.title, m.type, m.metric, m.target_value, m.reward, m.completed_date || null, m.celebration_notes || null, m.archived || false]
      );
    }
    const res = await pool.query(
      "SELECT id, title, type, metric, target_value::float as target_value, reward, completed_date::text, celebration_notes, archived FROM milestones WHERE id = $1",
      [m.id]
    );
    return res.rows[0] as Milestone;
  } catch (error) {
    console.error(`Error saving milestone ${m.id}:`, error);
    throw error;
  }
}

export async function deleteMilestone(id: string): Promise<void> {
  try {
    await pool.query("DELETE FROM milestones WHERE id = $1", [id]);
  } catch (error) {
    console.error(`Error deleting milestone ${id}:`, error);
    throw error;
  }
}

