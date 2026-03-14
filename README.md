## Resume Tailoring App (RoleTune) — MVP

This project is an MVP for a resume tailoring app that helps job seekers adapt an existing resume to a specific job description, without fabricating experience. It analyzes alignment, surfaces gaps, and generates improved wording for summaries and bullets, plus keyword/ATS suggestions.

---

## Installation & Setup

- **Node.js**
  - **Requirement**: Node.js **24.x LTS** (or later compatible with Next.js 14).
  - Install via `nvm`, `fnm`, or from the official website.

- **Package manager**
  - Recommended: **pnpm** or **yarn**, but **npm** works as well.
  - Examples in this README will use `pnpm`. Substitute `npm`/`yarn` as preferred.

- **PostgreSQL**
  - Install Postgres locally (e.g. Postgres.app on macOS, Homebrew `brew install postgresql`, or Docker).
  - **Option A — Postgres.app (macOS, easiest)**
    - Download Postgres.app from the official site and move it to `Applications`.
    - Open Postgres.app and start a server (e.g. version 15+).
    - Click the database icon to open `psql`, then run:
      ```sql
      CREATE DATABASE resume_app;
      ```
    - Your connection string will look like:
      - `postgresql://YOUR_MAC_USERNAME@localhost:5432/resume_app?schema=public`
  - **Option B — Homebrew (macOS CLI)**
    - Install Postgres:
      ```bash
      brew install postgresql
      brew services start postgresql
      ```
    - Create the database:
      ```bash
      createdb resume_app
      ```
    - Default connection string (no password) is usually:
      - `postgresql://YOUR_MAC_USERNAME@localhost:5432/resume_app?schema=public`
    - If you prefer a dedicated user/password:
      ```bash
      createuser resume_user --pwprompt
      createdb resume_app -O resume_user
      ```
      Then use:
      - `postgresql://resume_user:YOUR_PASSWORD@localhost:5432/resume_app?schema=public`
  - **Option C — Docker (isolated)**
    - Run a disposable Postgres container:
      ```bash
      docker run --name resume-postgres -e POSTGRES_USER=resume_user -e POSTGRES_PASSWORD=resume_password -e POSTGRES_DB=resume_app -p 5432:5432 -d postgres:16
      ```
    - Connection string:
      - `postgresql://resume_user:resume_password@localhost:5432/resume_app?schema=public`
  - To see your current connection info from `psql`, run:
    ```sql
    \conninfo
    ```
  - Set `DATABASE_URL` in `.env.local` using the connection string format shown above.

- **Supabase (storage + optional auth)**
  - Create a project at [Supabase](https://supabase.com/).
  - Set up:
    - **Storage bucket** for resumes (e.g. `resumes`).
    - (Optional) **Auth** configuration if you want user accounts in the MVP.
  - Collect the following values from the Supabase dashboard:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - (Optional, for server-side operations) `SUPABASE_SERVICE_ROLE_KEY`

- **OpenAI**
  - Create an API key in the OpenAI dashboard.
  - Store it as `OPENAI_API_KEY` in your environment.

---

## Environment Configuration

Create a `.env.local` file in the project root (Next.js convention) with at least:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/resume_app?schema=public"
OPENAI_API_KEY="sk-..."

NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="public-anon-key"

SUPABASE_SERVICE_ROLE_KEY="service-role-key-optional"
SUPABASE_STORAGE_BUCKET="resumes"
```

Adjust names and URLs to match your setup. Never commit real keys to git.

If your database password contains special characters (e.g. `?`, `,`, `@`, `#`), **URL-encode** them in `DATABASE_URL` (e.g. `?` → `%3F`, `,` → `%2C`, `@` → `%40`, `#` → `%23`). Otherwise some tools may misparse the URL and fail to connect (e.g. "Can't reach database server at `postgres:5432`").

**Prisma and `DATABASE_URL`:** The Prisma CLI only loads variables from a `.env` file in the project root, not from `.env.local`. If you keep your credentials in `.env.local`, either add `DATABASE_URL` to a `.env` file as well, or run Prisma commands with the variable loaded (e.g. on macOS/Linux: `export $(grep -v '^#' .env.local | xargs) && npx prisma migrate dev --name init`).

---

## Project Setup, Scripts & Tests

Once the Next.js app is initialized (Step 1 of the docs workflow):

```bash
npm install
```

For Prisma and database:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

- **When to run these:** Use `migrate dev` whenever you change `prisma/schema.prisma` (use a descriptive `--name` for each change, e.g. `--name add_job_description`). Use `generate` after a fresh install or when you’ve pulled new migrations and need the Prisma Client regenerated; `migrate dev` runs `generate` for you after applying migrations. If you see `Environment variable not found: DATABASE_URL`, see the "Prisma and DATABASE_URL" note in **Environment Configuration** above.

To run the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

- **Run tests**
  - This project uses **Jest** and **React Testing Library** for basic unit and integration tests:
    - `jest.config.cjs` — Jest configuration (JS DOM env, TypeScript via `ts-jest`).
    - `jest.setup.ts` — Jest setup file (adds `@testing-library/jest-dom` matchers).
    - Tests live under `__tests__/`.
  - To run the full test suite:
    ```bash
    npm test
    ```
  - To run tests in watch mode (re-run on file changes):
    ```bash
    npm test -- --watch
    ```
  - Current tests cover:
    - `lib/utils` (`cn` helper).
    - `app/page.tsx` (home/dashboard renders main CTA).
    - `app/upload/page.tsx` (upload form elements).
    - `app/api/resumes/upload/route.ts` (basic validation branches for the upload API).

---

## High-Level Architecture

- **Frontend**
  - Next.js 14+ with React 18 and TypeScript.
  - Tailwind CSS for styling.
  - `shadcn/ui` for reusable components.
  - Main pages:
    - `Dashboard` (entry point, previous sessions)
    - `Upload` (resume upload + text extraction preview)
    - `Job Description` / `Analysis` (JD input and analysis results)
    - `Tailor` (side-by-side tailoring workspace)
    - `Export` (copy/export tailored content).

- **Backend**
  - Next.js **API routes** for all server-side logic.
  - Responsibilities:
    - File upload handling.
    - Text extraction from PDFs/DOCX.
    - Calling OpenAI for:
      - JD analysis.
      - Resume parsing.
      - Gap analysis.
      - Suggestion/rewrite generation.
      - Rationale generation.
    - Persistence of users, resumes, JDs, tailoring sessions, and suggestions.

- **Database (Postgres + Prisma)**
  - Core models:
    - `User` — identifies a person using the system.
    - `Resume` — uploaded file + extracted text and structured parse.
    - `JobDescription` — raw JD text + structured requirements.
    - `TailoringSession` — links a resume and JD, with score + analysis JSON.
    - `Suggestion` — individual summary/bullet/keyword suggestions with rationale and acceptance state.

- **File Storage (Supabase Storage or S3)**
  - Used to store uploaded resume files (PDF/DOCX).
  - The database stores only `file_url` and extracted text/JSON.

- **AI Integration**
  - All AI functionality is centralized in `/lib/openai.ts` and related helper modules:
    - Prompt templates for:
      - JD extraction.
      - Resume parsing.
      - Gap analysis + scoring.
      - Rewrite generation.
      - Rationale generation.
    - Guardrails to:
      - **Never fabricate experience, tools, or scope.**
      - Only rephrase or highlight existing experience.

---

## Core User Flow

- **1. Upload Resume**
  - User uploads a PDF or DOCX.
  - API extracts raw text and normalizes it.
  - A `Resume` record is created and stored with `raw_text` (and later `parsed_json`).

- **2. Parse Resume**
  - API sends normalized `raw_text` to OpenAI.
  - AI returns structured JSON (summary, experience, skills, education, projects).
  - The structured representation is stored and powers later tailoring.

- **3. Analyze Job Description**
  - User pastes a JD + optional role title and company.
  - API calls OpenAI to extract:
    - required skills
    - preferred skills
    - responsibilities
    - seniority level
    - domain keywords.
  - A `JobDescription` record is stored with `requirements_json`.

- **4. Run Tailoring Session**
  - User chooses a resume and a JD.
  - API:
    - Compares resume vs JD.
    - Computes an alignment **score** using weighted factors (e.g. required skills, relevant experience, seniority, domain, keywords, clarity).
    - Identifies strengths and gaps.
    - Generates `Suggestion` records for:
      - summary rewrites
      - bullet rewrites
      - keyword additions
      - skills adjustments
      - section-level feedback.

- **5. Review & Edit Suggestions**
  - Tailoring workspace shows a side-by-side view:
    - Left: original resume.
    - Right: suggested changes, grouped by section/bullet.
  - For each suggestion:
    - User can **accept**, **reject**, or **edit** the text.

- **6. Export Tailored Content**
  - After accepting changes, the user can:
    - Copy tailored summary.
    - Copy updated bullets.
    - Copy recommended keywords.
  - (Later) export a DOCX version of the tailored resume.

---

## Development Workflow (Step-by-Step)

This app is intended to be built iteratively, with each step having its own prompt and doc in `/docs`:

- **Step 1: Initialize Next.js project**
  - Create the Next.js 14+ app with TypeScript, Tailwind, and shadcn.
  - Set up basic layout and navigation shell.

- **Step 2: Implement resume upload + parsing**
  - File upload page and API route.
  - PDF/DOCX text extraction (using `pdf-parse`, `mammoth`, etc.).
  - Normalize and persist resume text and metadata.

- **Step 3: Implement JD extraction**
  - Form to paste job description, title, and company.
  - API route to call OpenAI and extract structured requirements JSON.

- **Step 4: Implement resume vs JD comparison**
  - Matching logic and scoring function (in `/lib/scoring.ts`).
  - API route to compute strengths, gaps, underemphasized skills.

- **Step 5: Implement suggestion engine**
  - API to generate summary and bullet rewrites, keyword and skills suggestions.
  - Guardrails to ensure **no fabricated experience**.
  - Store suggestions in the database.

- **Step 6: Build tailoring workspace UI**
  - Two-column editor (original vs suggested).
  - Controls to accept/reject/edit suggestions.
  - Display score, strengths, gaps, and keyword suggestions.

- **Step 7: Implement export flow**
  - Generate tailored summary, updated bullets, and keyword list.
  - Simple copy-to-clipboard and (later) DOCX export.

Each step will have its own doc in `/docs` with a detailed prompt you can provide to an AI coding assistant to implement that slice of functionality and commit progressively to git.

---

## External Services Summary

- **Postgres**
  - Local database for all entities.
  - Managed via Prisma migrations.

- **Supabase**
  - Storage bucket for resume files.
  - Optional: Supabase Auth for users.

- **OpenAI**
  - Powers all text understanding and rewriting:
    - JD extraction.
    - Resume parsing.
    - Gap analysis and scoring.
    - Rewrites + rationales.

The combination of these services plus Next.js API routes provides a full-stack environment for building and iterating on the resume tailoring experience.

