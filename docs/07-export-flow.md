## Step 7 — Export Tailored Resume Content

Use this prompt when you are ready to implement the **export flow** that assembles tailored content (summary, bullets, keywords) for copying or later DOCX export. This step assumes Steps 1–6 are complete.

---

### Prompt for the AI coding agent

You are working in an existing Next.js 14+ (App Router, TypeScript) project for a resume tailoring app called **RoleTune**.  
Steps 1–6 are complete:
- Project scaffold, resume upload, JD extraction.
- Alignment scoring and tailoring sessions.
- Suggestion engine and tailoring workspace UI with accept/reject/edit.

Now implement **Step 7: Export tailored content** according to the following requirements.

---

### High-level goal for this step

- For a given `TailoringSession`, build a coherent **export payload** that includes:
  - `tailored_summary`
  - `tailored_bullets`
  - `keywords`
- Provide a UI where the user can:
  - Copy tailored summary.
  - Copy updated bullets.
  - Copy keyword suggestions.
- Optionally, set up a placeholder for future DOCX export, but you do **not** need to fully implement DOCX generation in this step.

---

### Backend: Export API

- Implement `POST /app/api/export`.
- Input JSON:
  - `session_id`
- Steps:
  1. Load:
     - `TailoringSession` by `session_id`.
     - Associated `Resume` (including original `raw_text` and/or `parsed_json`).
     - All `Suggestion` records for this session.
  2. From suggestions:
     - Consider **only accepted suggestions** when building the tailored content.
  3. Build:
     - `tailored_summary`:
       - Start from original summary in `parsed_json` (if available) or a best-effort extraction from `raw_text`.
       - Apply accepted `summary_rewrite` suggestion(s). If multiple, decide how to prioritize (e.g. take the latest accepted one).
     - `tailored_bullets`:
       - For each experience bullet:
         - If there is an accepted `bullet_rewrite` suggestion, use `suggested_text`.
         - Otherwise, keep the original bullet.
     - `keywords`:
       - Combine:
         - JD `domain_keywords` and required/preferred skills.
         - Any explicit `keyword_addition`/`skills_adjustment` suggestions that were accepted.
       - De-duplicate and sort.
  4. Return JSON:
     - `tailored_summary: string`
     - `tailored_bullets: string[]` (or structured by section)
     - `keywords: string[]`

---

### Frontend: Export Screen

- Create a route, e.g.: `/app/export/[sessionId]/page.tsx`.
- On load:
  - Call `POST /api/export` with `session_id` from the route.
  - Show loading and error states appropriately.

- UI sections:
  - **Tailored Summary**
    - A `Card` with a read-only `Textarea` or code-like block containing `tailored_summary`.
    - A “Copy Summary” button using the Clipboard API.
  - **Updated Bullets**
    - A `Card` listing bullets, grouped by experience section if possible.
    - “Copy Bullets” button:
      - Copies all bullets as a formatted list (e.g. bullet points joined by newlines).
  - **Keyword Suggestions**
    - A `Card` with keyword chips/badges.
    - “Copy Keywords” button:
      - Copies a comma-separated or newline-separated list.

Use `shadcn/ui` components (`Card`, `Button`, `Textarea`, `Badge`, etc.) to keep styling consistent with the rest of the app.

---

### Optional: DOCX Export Hook

- Add a placeholder for future DOCX export:
  - E.g. a secondary button: “Export DOCX (coming soon)” that is currently disabled or shows a tooltip.
  - Optionally:
    - Create a small utility module `lib/export-docx.ts` with a stubbed function and TODO comments to implement DOCX generation later.

---

### Guardrails

- Ensure that export content respects the **no-fabrication** rule:
  - Since suggestions are already guardrailed, this should be inherently satisfied.
  - However, avoid adding any new inferred claims during export assembly.

- Be explicit in code comments/hooks that:
  - The export is derived from original + accepted suggestions only.

---

### What to output / verify

- Confirm:
  - `/api/export` endpoint behavior and JSON contract.
  - `/export/[sessionId]` page UI and interactions.
  - Copy-to-clipboard functions for each content block.
- Manual test:
  - Complete a session with some accepted suggestions.
  - Navigate to the export page.
  - Verify:
    - Tailored summary and bullets match your accepted suggestions.
    - Keywords list is reasonable and deduplicated.
    - Copy buttons work as expected.

