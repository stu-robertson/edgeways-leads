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
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'printed', 'delivered', 'interested', 'ignored')),
      notes TEXT,
      next_contact_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

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
}

// Trigger initialization and log outcome
initDb().then(() => {
  console.log("PostgreSQL database initialization completed successfully.");
}).catch((err) => {
  console.error("Failed to initialize PostgreSQL database tables:", err);
});

/**
 * Generates a UUID v7 compliant string.
 * UUID v7 contains a 48-bit timestamp followed by 74 bits of entropy/metadata.
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
  sic_codes: string | null; // Comma-separated or JSON string
  status: 'new' | 'printed' | 'delivered' | 'interested' | 'ignored';
  notes: string | null;
  next_contact_date: string | null;
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
      "SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, status, notes, next_contact_date::text, created_at::text FROM leads ORDER BY incorporation_date DESC, created_at DESC"
    );
    return res.rows as Lead[];
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

export async function saveLead(lead: Omit<Lead, "id" | "created_at" | "status" | "notes" | "next_contact_date">): Promise<Lead> {
  const id = generateUUIDv7();
  try {
    await pool.query(
      `
      INSERT INTO leads (id, company_number, name, incorporation_date, postcode, address, sic_codes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
      ON CONFLICT(company_number) DO UPDATE SET
        name = EXCLUDED.name,
        incorporation_date = EXCLUDED.incorporation_date,
        postcode = EXCLUDED.postcode,
        address = EXCLUDED.address,
        sic_codes = EXCLUDED.sic_codes
      `,
      [
        id,
        lead.company_number,
        lead.name,
        lead.incorporation_date,
        lead.postcode,
        lead.address,
        lead.sic_codes
      ]
    );

    const res = await pool.query(
      "SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, status, notes, next_contact_date::text, created_at::text FROM leads WHERE company_number = $1",
      [lead.company_number]
    );
    return res.rows[0] as Lead;
  } catch (error) {
    console.error(`Error saving lead ${lead.company_number}:`, error);
    throw error;
  }
}

export async function updateLead(id: string, updates: { status?: Lead["status"]; notes?: string | null; next_contact_date?: string | null }): Promise<Lead> {
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
      "SELECT id, company_number, name, incorporation_date::text, postcode, address, sic_codes, status, notes, next_contact_date::text, created_at::text FROM leads WHERE id = $1",
      [id]
    );
    return res.rows[0] as Lead;
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
