## Step 2 — Resume Upload & Text Extraction

Use this prompt when you are ready to implement **resume upload and text extraction**, persisting the raw text in the database and storage. Do not implement AI-based parsing into structured JSON yet (that is Step 3+).

---

### Prompt for the AI coding agent

You are working in an existing Next.js 14+ (App Router, TypeScript) project for a resume tailoring app called **RoleTune**.  
Step 1 (project initialization, Tailwind, shadcn/ui, basic layout) is already complete.

Now implement **Step 2: Resume upload + parsing (text extraction)** according to the following requirements.

---

### High-level goal for this step

- Allow the user to:
  - Upload a resume file (PDF or DOCX).
  - Extract raw text from the file.
  - Normalize/clean the text.
  - Save:
    - The file to Supabase Storage (or S3-equivalent abstraction).
    - A `Resume` record in Postgres with `raw_text` and metadata.
  - Show a preview of the extracted text in the UI.

---

### Data & schema expectations

- Use Prisma with Postgres.
- Define/update the `Resume` model in `prisma/schema.prisma`:
  - `id` (string/UUID or `Int` autoincrement)
  - `user_id` (nullable for now if auth is not implemented yet)
  - `filename` (string)
  - `file_url` (string)
  - `raw_text` (text)
  - `parsed_json` (JSON field, nullable — will be used later)
  - `created_at` (DateTime, default `now()`)
- Run migrations and ensure the database is ready to store resumes.

---

### Backend implementation details

- **Libraries**
  - Add dependencies for file parsing:
    - For PDF: `pdf-parse` (or similar).
    - For DOCX: `mammoth` or `docx` parser.
  - Add a Supabase client helper in `lib/supabase.ts` (or similar) using environment variables:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY` (if needed for server-side upload).

- **API Route: Upload Resume**
  - Implement `POST /app/api/resumes/upload` (App Router route handler).
  - Accept multipart form data with:
    - `file`: the uploaded file.
  - Steps:
    1. Validate file type (accept only PDF, DOCX for now).
    2. Upload the file to Supabase Storage bucket (e.g. `resumes`) and get a public or signed URL.
    3. Extract text depending on file type:
       - PDF → use `pdf-parse`.
       - DOCX → use `mammoth` or equivalent.
    4. Normalize text:
       - Strip excessive whitespace.
       - Normalize line breaks.
       - Keep bullet markers where possible.
    5. Insert a `Resume` record with:
       - `filename`
       - `file_url`
       - `raw_text`
       - `parsed_json` = `null`
    6. Return JSON:
       - `resume_id`
       - `raw_text`
       - `file_url`

---

### Frontend implementation details

- **Upload page**
  - Create a route: `/app/upload/page.tsx`.
  - UI:
    - A card with:
      - File input (PDF/DOCX).
      - Upload button.
    - After upload:
      - Show a preview of `raw_text` in a scrollable area.
      - Show basic metadata (filename).
  - Use `shadcn/ui` components where appropriate (`Card`, `Button`, `Input`, `Alert` for errors).

- **UX & error handling**
  - Show a loading state during upload and parsing.
  - Display user-friendly errors for:
    - Unsupported file types.
    - Backend or network errors.

---

### Guardrails and future hooks

- Do **not** call OpenAI yet in this step.
- Ensure the upload API route is structured so later steps can:
  - Reuse the stored `Resume` by `id`.
  - Add a separate API to parse the resume into structured JSON using AI.

---

### What to output / verify

- Confirm:
  - The new Prisma `Resume` model and migration.
  - The API route path and contract.
  - Supabase upload works end-to-end with environment variables described in `README`.
- Manually test (describe steps briefly):
  - Start dev server.
  - Visit `/upload`.
  - Upload a sample PDF/DOCX.
  - Confirm:
    - File stored in Supabase.
    - `Resume` record created.
    - Extracted text appears in the UI.

