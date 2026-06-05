import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

// Path to SQLite database file
const dbPath = path.resolve(process.cwd(), "data.db");

// Initialize database connection
const db = new Database(dbPath, { verbose: console.log });

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS watched_locations (
    id TEXT PRIMARY KEY,
    location TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    company_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    incorporation_date TEXT NOT NULL,
    postcode TEXT,
    address TEXT,
    sic_codes TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'ignored')),
    notes TEXT,
    next_contact_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

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
  status: 'new' | 'contacted' | 'interested' | 'ignored';
  notes: string | null;
  next_contact_date: string | null;
  created_at: string;
}

// DB Operations

// --- Watched Locations ---
export function getWatchedLocations(): WatchedLocation[] {
  try {
    const stmt = db.prepare("SELECT * FROM watched_locations ORDER BY location ASC");
    return stmt.all() as WatchedLocation[];
  } catch (error) {
    console.error("Error fetching watched locations:", error);
    return [];
  }
}

export function addWatchedLocation(location: string): WatchedLocation {
  const id = generateUUIDv7();
  const trimmed = location.trim().toUpperCase();
  try {
    const stmt = db.prepare("INSERT INTO watched_locations (id, location) VALUES (?, ?)");
    stmt.run(id, trimmed);
    
    const selectStmt = db.prepare("SELECT * FROM watched_locations WHERE id = ?");
    return selectStmt.get(id) as WatchedLocation;
  } catch (error) {
    console.error(`Error adding watched location ${trimmed}:`, error);
    throw error;
  }
}

export function deleteWatchedLocation(id: string): void {
  try {
    const stmt = db.prepare("DELETE FROM watched_locations WHERE id = ?");
    stmt.run(id);
  } catch (error) {
    console.error(`Error deleting watched location ${id}:`, error);
    throw error;
  }
}

// --- Leads ---
export function getLeads(): Lead[] {
  try {
    const stmt = db.prepare("SELECT * FROM leads ORDER BY incorporation_date DESC, created_at DESC");
    return stmt.all() as Lead[];
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

export function saveLead(lead: Omit<Lead, "id" | "created_at" | "status" | "notes" | "next_contact_date">): Lead {
  const id = generateUUIDv7();
  try {
    const stmt = db.prepare(`
      INSERT INTO leads (id, company_number, name, incorporation_date, postcode, address, sic_codes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
      ON CONFLICT(company_number) DO UPDATE SET
        name = excluded.name,
        incorporation_date = excluded.incorporation_date,
        postcode = excluded.postcode,
        address = excluded.address,
        sic_codes = excluded.sic_codes
    `);
    
    stmt.run(
      id,
      lead.company_number,
      lead.name,
      lead.incorporation_date,
      lead.postcode,
      lead.address,
      lead.sic_codes
    );

    const selectStmt = db.prepare("SELECT * FROM leads WHERE company_number = ?");
    return selectStmt.get(lead.company_number) as Lead;
  } catch (error) {
    console.error(`Error saving lead ${lead.company_number}:`, error);
    throw error;
  }
}

export function updateLead(id: string, updates: { status?: Lead["status"]; notes?: string | null; next_contact_date?: string | null }): Lead {
  const fields: string[] = [];
  const params: any[] = [];

  if (updates.status !== undefined) {
    fields.push("status = ?");
    params.push(updates.status);
  }

  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    params.push(updates.notes);
  }

  if (updates.next_contact_date !== undefined) {
    fields.push("next_contact_date = ?");
    params.push(updates.next_contact_date);
  }

  if (fields.length === 0) {
    const selectStmt = db.prepare("SELECT * FROM leads WHERE id = ?");
    return selectStmt.get(id) as Lead;
  }

  params.push(id);
  const sql = `UPDATE leads SET ${fields.join(", ")} WHERE id = ?`;

  try {
    const stmt = db.prepare(sql);
    stmt.run(...params);

    const selectStmt = db.prepare("SELECT * FROM leads WHERE id = ?");
    return selectStmt.get(id) as Lead;
  } catch (error) {
    console.error(`Error updating lead ${id}:`, error);
    throw error;
  }
}

export function deleteLead(id: string): void {
  try {
    const stmt = db.prepare("DELETE FROM leads WHERE id = ?");
    stmt.run(id);
  } catch (error) {
    console.error(`Error deleting lead ${id}:`, error);
    throw error;
  }
}
