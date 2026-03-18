## Step 3 — Job Description Extraction

Use this prompt when you are ready to implement **job description input and structured extraction** using OpenAI. This step assumes resume upload + raw text extraction is already in place.

---

### Prompt for the AI coding agent

You are working in an existing Next.js 14+ (App Router, TypeScript) project for a resume tailoring app called **RoleTune**.  
Steps 1–2 (project initialization and resume upload + raw text extraction) are already implemented.

Now implement **Step 3: Job Description extraction** according to the following requirements.

---

### High-level goal for this step

- Allow the user to:
  - Paste a job description.
  - Provide a role title and company name.
  - Send this data to an API endpoint that:
    - Calls OpenAI with a **JD Extraction Prompt**.
    - Returns structured requirements JSON.
  - Persist a `JobDescription` record in the database.

---

### Data & schema expectations

- Update Prisma `JobDescription` model in `prisma/schema.prisma` with at least:
  - `id`
  - `user_id` (nullable for now)
  - `title` (string)
  - `company` (string)
  - `raw_text` (text)
  - `requirements_json` (JSON)
  - `created_at` (DateTime, default `now()`)

---

### Backend implementation details

- **OpenAI helper**
  - Create or extend `lib/openai.ts` with a helper function like:
    - `analyzeJobDescription(rawText: string): Promise<JDAnalysisResult>`
  - Define `JDAnalysisResult` TypeScript type matching the spec:
    - `required_skills: string[]`
    - `preferred_skills: string[]`
    - `responsibilities: string[]`
    - `seniority_level: string`
    - `domain_keywords: string[]`

- **Prompt design**
  - Implement a **JD Extraction Prompt** that:
    - Instructs the model to:
      - Read the given job description.
      - Output **only valid JSON** in the required structure.
      - Avoid extra commentary, markdown, or prose.
    - Captures:
      - Required skills
      - Preferred skills
      - Responsibilities
      - Seniority level
      - Domain-specific keywords
  - Include guardrails such as:
    - “If uncertain, return your best-guess arrays; do not invent irrelevant tools or technologies.”

- **API Route: Analyze Job Description**
  - Implement `POST /app/api/jd/analyze`.
  - Input JSON:
    - `title: string`
    - `company: string`
    - `raw_text: string`
  - Steps:
    1. Validate input.
    2. Call the OpenAI helper (`analyzeJobDescription`).
    3. Upsert a `JobDescription` record with:
       - `title`
       - `company`
       - `raw_text`
       - `requirements_json` = JD analysis JSON.
    4. Return JSON to the client:
       - `job_description_id`
       - `requirements` (the analysis JSON).

---

### Frontend implementation details

- **Job Description input page**
  - Create a route, e.g.: `/app/analysis/page.tsx` or `/app/jd/page.tsx` (consistent with your routing plan).
  - UI:
    - Inputs:
      - `Role Title`
      - `Company`
      - `Job Description` (multi-line textarea).
    - Button:
      - “Analyze Job Description”.
  - Behavior:
    - On submit:
      - Call `POST /api/jd/analyze`.
      - Show loading/spinner.
    - On success:
      - Display the structured output:
        - Required skills
        - Preferred skills
        - Responsibilities
        - Seniority level
        - Domain keywords
      - Optionally show raw JSON in a collapsible area for debugging.

- **Component usage**
  - Use `shadcn/ui` components (`Card`, `Input`, `Textarea`, `Button`, `Badge`, etc.).
  - Highlight required vs preferred skills clearly.

---

### Guardrails

- OpenAI responses must be parsed robustly:
  - Handle potential JSON parsing errors gracefully.
  - If parsing fails, show a clear error and guidance to the user.
- Do not yet run gap analysis or tailoring here; this step only:
  - Captures the JD.
  - Extracts and persists structured requirements.

---

### What to output / verify

- Confirm:
  - The new/updated `JobDescription` model and migration.
  - The `analyzeJobDescription` helper and prompt.
  - The `/api/jd/analyze` endpoint contract.
  - The JD input page and its behavior.
- Add automated tests for:
  - The OpenAI helper (using a mocked OpenAI client, verifying prompt shape and response handling).
  - The `/api/jd/analyze` endpoint happy-path and basic validation.
  - The JD input page rendering and submit behavior (mocking the API call).
- Manual test flow (describe briefly):
  - Paste a sample JD.
  - Run analysis.
  - See structured data rendered.
  - Confirm a `JobDescription` row is created in the database.

