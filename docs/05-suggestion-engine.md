## Step 5 — Suggestion Engine (Summary, Bullets, Keywords)

Use this prompt when you are ready to implement the **suggestion engine** that generates rewrites and recommendations based on the resume vs JD analysis. This step assumes Steps 1–4 are complete.

---

### Prompt for the AI coding agent

You are working in an existing Next.js 14+ (App Router, TypeScript) project for a resume tailoring app called **RoleTune**.  
Steps 1–4 (project initialization, resume upload, JD extraction, and alignment scoring) are already implemented.

Now implement **Step 5: Suggestion engine** according to the following requirements.

---

### High-level goal for this step

- From:
  - A `TailoringSession` (score + strengths/gaps/underemphasized_skills).
  - The parsed resume JSON.
  - The JD requirements JSON.
- Implement:
  - AI-powered suggestions for:
    - `summary_rewrite`
    - `bullet_rewrite`
    - `keyword_addition`
    - `skills_adjustment`
    - `section_feedback`
  - Each suggestion must include:
    - `original_text`
    - `suggested_text`
    - `rationale`
    - `jd_mapping` (what JD requirement it helps address).
    - `type`
    - `accepted` flag (default `false`).

**Critical guardrail**:  
The AI must **never invent experience, tools, scope, management responsibilities, or certifications** that are not already present in the resume. It may only rephrase, emphasize, or re-order existing content, and suggest explicit keyword additions that are consistent with the existing experience.

---

### Data & schema expectations

- Update Prisma `Suggestion` model in `prisma/schema.prisma` with:
  - `id`
  - `session_id` (FK to `TailoringSession`)
  - `type` (string enum or text; values: `summary_rewrite`, `bullet_rewrite`, `keyword_addition`, `skills_adjustment`, `section_feedback`)
  - `original_text` (text)
  - `suggested_text` (text)
  - `rationale` (text)
  - `jd_mapping` (JSON or text; can hold requirement IDs/labels)
  - `accepted` (boolean, default `false`)

---

### OpenAI helpers & prompts

- Extend `lib/openai.ts` (or similar) with helpers:
  - `generateSuggestions(args: { resume: ParsedResume; jd: JDAnalysisResult; analysis: AlignmentResult }): Promise<GeneratedSuggestion[]>`
  - `GeneratedSuggestion` maps cleanly to the `Suggestion` model fields.

- Implement **separate prompt sections** inside the helper for:
  - **Rewrite Prompt**
    - Inputs:
      - Parsed resume JSON.
      - JD requirements JSON.
      - Alignment analysis (strengths, gaps, underemphasized skills).
    - Rules:
      - Rewrite only using existing experience.
      - No fabricated tools, scope, titles, or years.
      - Do not introduce new companies or projects.
      - You may:
        - Reorder bullet content.
        - Clarify impact.
        - Add metrics only if they are explicitly stated or clearly implied.
  - **Rationale Prompt**
    - For each suggestion, produce:
      - A short explanation of why the rewrite helps.
      - A mapping to 1–N JD requirements (e.g. strings or IDs).

- Output format:
  - Ask the model to output **JSON only**, e.g.:
    ```json
    {
      "suggestions": [
        {
          "type": "bullet_rewrite",
          "original_text": "...",
          "suggested_text": "...",
          "rationale": "...",
          "jd_mapping": ["required_skills:react", "responsibility:build_ui"]
        }
      ]
    }
    ```
  - Parse this JSON and map to `Suggestion` records.

---

### API Routes: Generate & Accept Suggestions

- **Generate Suggestions**
  - Option A (recommended): Fold into existing `POST /app/api/tailor/run`:
    - After computing the alignment score, also call `generateSuggestions` and persist suggestions for that `session_id`.
  - Option B: Create a new endpoint:
    - `POST /app/api/tailor/suggestions`
    - Input: `session_id`
    - Steps:
      1. Load session, resume, and JD.
      2. Call OpenAI helper to generate suggestions.
      3. Insert `Suggestion` records.
      4. Return `suggestions[]`.

- **Accept / Reject Suggestion**
  - Implement `PATCH /app/api/suggestions/[id]`.
  - Input JSON:
    - `accepted: boolean`
  - Steps:
    1. Validate request.
    2. Update the `accepted` field.
    3. Return updated suggestion.

---

### Guardrails & validation

- Before saving suggestions:
  - Optionally run basic sanity checks:
    - Ensure `suggested_text` is not empty.
    - Ensure `original_text` is present.
  - Consider truncating overly long suggestions.

- Prompt must clearly state:
  - “Only rewrite or rephrase existing experience.”
  - “Never invent technologies, experience scope, management responsibilities, or certifications.”

---

### Frontend (basic integration)

- Do **not** build the full tailoring workspace UI yet (that’s Step 6), but:
  - Optionally add a simple debug view to show suggestions for a session:
    - e.g. `/app/tailor/debug/[sessionId]`:
      - List suggestions with:
        - Type
        - Original text
        - Suggested text
        - Rationale
      - Buttons to:
        - Accept / Reject (calls PATCH endpoint).

This will make it easier to verify the suggestion engine before polishing the main UX.

---

### What to output / verify

- Confirm:
  - Updated `Suggestion` model and migration.
  - OpenAI suggestion helper and prompts.
  - Suggestions are linked to `TailoringSession`.
  - Accept/reject endpoint works.
- Add tests that:
  - Exercise the suggestion generation helper with a mocked OpenAI client (ensuring guardrail instructions are present and JSON is parsed correctly).
  - Cover the generate-suggestions endpoint (or combined tailoring endpoint) and the `PATCH /api/suggestions/[id]` accept/reject flows.
- Manual test:
  - Run a session for a known resume + JD.
  - Trigger suggestion generation.
  - Inspect generated suggestions and rationales.
  - Accept or reject a suggestion and verify the DB update.

