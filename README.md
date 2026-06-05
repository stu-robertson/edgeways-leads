# Edgeways Leads - Companies House Local Lead Identifier

Edgeways Leads is a premium, local-first web utility built with **Next.js (App Router, TypeScript)**, **Tailwind CSS v4**, and **SQLite (`better-sqlite3`)**. It enables local business development professionals to monitor Companies House records and identify newly registered companies in specific geographic areas (e.g. postcodes or cities) on a daily basis, and manage them within a built-in CRM dashboard.

## Features

- **Lead Finder Dashboard:** Run targeted scans for new businesses incorporated today, yesterday, in the last 7 days, or the last 30 days.
- **Watched Locations Manager:** Save and monitor specific postcode prefixes (e.g. `CB1`, `EH1`) or cities/towns (e.g. `London`, `Manchester`).
- **Basic CRM Lead Tracking:**
  - Save discovered companies as leads.
  - Track client status through custom pipeline stages (`New`, `Contacted`, `Interested`, `Ignored`).
  - Set **next callback dates** to manage client follow-up timing.
  - Record internal CRM comments and conversation notes in an inline editor.
- **Sleek dark theme layout** built using Tailwind CSS v4 featuring responsive grids, clean cards, and smooth CSS hover transitions.
- **No external DB dependencies:** Runs out-of-the-box using a local SQLite database file (`data.db`).

---

## Getting Started

### 1. Prerequisites

Make sure you have Node.js installed (v20+ recommended).

### 2. Obtain a Companies House API Key

To query public records, you will need a free Companies House developer account:
1. Go to the [Companies House Developer Hub](https://developer.company-information.service.gov.uk/).
2. Create an account and sign in.
3. Click **"Your Apps"** and select **"Create New App"**.
4. Fill in the name and description. Choose **"Live"** for the environment type.
5. In the **"Rest API key"** section, generate a key.
6. Copy your REST API key.

### 3. Setup Configuration

Create your local environment file:
```bash
cp .env.example .env.local
```

Open `.env.local` and paste your key:
```env
COMPANIES_HOUSE_API_KEY=your_copied_api_key_here
PORT=3000
HOSTNAME=127.0.0.1
```

*Note: In alignment with secure coding principles, the app is configured to bind strictly to localhost (`127.0.0.1`) instead of `0.0.0.0` for local safety.*

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

Start the local development server:
```bash
npm run dev
```

Open your browser and navigate to `http://127.0.0.1:3000`.

---

## Technical & Security Highlights

- **BFF (Backend-For-Frontend) Proxy:** Client requests do not hit the Companies House API directly. A Next.js API Route acts as a secure intermediary (`/api/search`), keeping the `COMPANIES_HOUSE_API_KEY` hidden from the client browser and preventing CORS errors.
- **SQL Injection Prevention:** Database queries in `src/lib/db.ts` use strictly prepared statements and parameterization (e.g. `stmt.run(id, trimmed)`) rather than string concatenation.
- **XSS Prevention:** All DOM manipulations are managed using React's safe JSX rendering (which auto-escapes output). Unsafe rendering features (like `dangerouslySetInnerHTML`) are completely avoided.
- **Database Integrity:** Primary keys are generated using cryptographically secure **UUID v7** formats on the server side (`src/lib/db.ts`), ensuring time-sortable identifiers and full compatibility with Supabase/PostgreSQL schema patterns if migrated in the future.
