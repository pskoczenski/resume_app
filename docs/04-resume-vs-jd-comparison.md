## Step 4 — Resume vs JD Comparison & Scoring

Use this prompt when you are ready to implement **resume vs job description comparison and alignment scoring**, based on the structured resume and JD data. This step assumes Steps 1–3 are complete.

---

### Prompt for the AI coding agent

You are working in an existing Next.js 14+ (App Router, TypeScript) project for a resume tailoring app called **RoleTune**.  
Steps 1–3 (project initialization, resume upload + raw text extraction, and JD extraction) are already implemented.

Now implement **Step 4: Resume vs JD comparison & scoring** according to the following requirements.

---

### High-level goal for this step

- Given:
  - A parsed resume (structured JSON, to be added in a prior or parallel step).
  - A structured job description (requirements JSON from Step 3).
- Implement:
  - A matching algorithm that:
    - Compares skills, responsibilities, seniority, domain, and keywords.
    - Produces an overall alignment score (0–100%).
    - Identifies:
      - Strengths
      - Gaps
      - Underemphasized skills.
  - A `TailoringSession` record to store this analysis.

> NOTE: If the AI resume parsing into JSON is not yet implemented, stub a simple `parsed_json` structure or add a temporary helper that simulates it so you can focus on the comparison logic interface.

---

### Data & schema expectations

- Update Prisma `TailoringSession` model in `prisma/schema.prisma` with:
  - `id`
  - `resume_id`
  - `job_description_id`
  - `score` (number / decimal, 0–100)
  - `analysis_json` (JSON) containing:
    - `strengths: string[]`
    - `gaps: string[]`
    - `underemphasized_skills: string[]`
  - `created_at` (DateTime, default `now()`)

---

### Matching algorithm implementation

- Create `lib/scoring.ts` (or similar) with functions like:
  - `computeAlignmentScore(args: { resume: ParsedResume; jd: JDAnalysisResult }): AlignmentResult`
  - Types:
    - `ParsedResume` — matches your resume JSON structure (summary, experience, skills, etc.).
    - `JDAnalysisResult` — matches the JD extraction output.
    - `AlignmentResult`:
      - `score: number`
      - `strengths: string[]`
      - `gaps: string[]`
      - `underemphasized_skills: string[]`

- Implement a **weighted scoring system** using the given factors:

| Factor                | Weight |
|-----------------------|--------|
| Required skill overlap| 30%    |
| Relevant experience   | 25%    |
| Seniority alignment   | 15%    |
| Domain alignment      | 10%    |
| Keyword coverage      | 10%    |
| Communication clarity | 10%    |

- Suggested approach:
  - **Required skill overlap (30%)**
    - Compare JD `required_skills` vs resume `skills` and experience bullets.
    - Compute a coverage ratio (e.g. matched / total).
  - **Relevant experience (25%)**
    - Check if responsibilities in JD are reflected in resume bullets.
    - Use simple keyword/phrase matching to estimate coverage.
  - **Seniority alignment (15%)**
    - Map JD `seniority_level` to an enum.
    - Infer resume seniority based on titles and years if available.
  - **Domain alignment (10%)**
    - Match JD `domain_keywords` vs resume text.
  - **Keyword coverage (10%)**
    - Count important keywords from JD appearing in resume text.
  - **Communication clarity (10%)**
    - Simple heuristic, e.g. average bullet length, presence of impact words, etc. (can start very basic).

Return a single normalized `score` between 0–100 and arrays of human-readable `strengths`, `gaps`, and `underemphasized_skills`.

---

### API Route: Run Tailoring (analysis-only)

- Implement `POST /app/api/tailor/run`.
- Input JSON:
  - `resume_id`
  - `jd_id`
- Steps:
  1. Load:
     - `Resume` by `resume_id` (including its `parsed_json` field or stub).
     - `JobDescription` by `jd_id` (including `requirements_json`).
  2. Call the scoring function from `lib/scoring.ts`.
  3. Create a `TailoringSession` record with:
     - `resume_id`
     - `job_description_id`
     - `score`
     - `analysis_json` (strengths, gaps, underemphasized_skills).
  4. Return JSON:
     - `session_id`
     - `score`
     - `strengths`
     - `gaps`
     - `underemphasized_skills`

> Do **not** yet generate per-bullet or summary rewrite suggestions in this step (that’s Step 5).

---

### Frontend integration (basic)

- Add a simple UI to trigger tailoring analysis:
  - Could be:
    - A section on the dashboard, or
    - A dedicated `/app/analysis` page.
  - For now, a basic form is acceptable:
    - Inputs (or dropdowns) for selecting:
      - `resume_id`
      - `jd_id`
    - A button: “Run Alignment Analysis”.
  - On submit:
    - Call `POST /api/tailor/run`.
    - Display:
      - Score.
      - Strengths list.
      - Gaps list.
      - Underemphasized skills list.

This UI can be simple; a more sophisticated tailoring workspace will be built in Step 6.

---

### Guardrails

- If `Resume.parsed_json` is not yet populated:
  - Implement a clear fallback:
    - Either block analysis with a helpful message.
    - Or stub a minimal parsed structure and clearly mark as temporary in comments.
- Ensure the scoring logic is:
  - Deterministic.
  - Testable (consider adding unit tests for `computeAlignmentScore`).

---

### What to output / verify

- Confirm:
  - The new/updated `TailoringSession` model and migration.
  - The scoring helper in `lib/scoring.ts`.
  - The `/api/tailor/run` endpoint contract.
  - The basic UI for triggering analysis.
- Add tests for:
  - `computeAlignmentScore` with a few representative combinations of resume/JD data.
  - The `/api/tailor/run` endpoint behavior (e.g. missing IDs vs. valid IDs), using stubs/mocks for Prisma.
- Manual test (describe briefly):
  - Create a sample resume and JD (from earlier steps).
  - Run tailoring.
  - See a numeric score and lists of strengths/gaps/underemphasized skills.
  - Confirm the `TailoringSession` record is stored in the database.

