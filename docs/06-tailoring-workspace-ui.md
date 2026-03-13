## Step 6 — Tailoring Workspace UI (Side-by-Side Editor)

Use this prompt when you are ready to build the **tailoring workspace UI**, showing the original resume and AI suggestions side by side, with controls to accept/reject/edit suggestions. This step assumes Steps 1–5 are complete.

---

### Prompt for the AI coding agent

You are working in an existing Next.js 14+ (App Router, TypeScript) project for a resume tailoring app called **RoleTune**.  
Steps 1–5 are complete:
- Project scaffold with Tailwind/shadcn.
- Resume upload + raw text extraction.
- JD extraction.
- Alignment scoring and tailoring sessions.
- Suggestion engine with stored `Suggestion` records and accept/reject API.

Now implement **Step 6: Tailoring workspace UI** according to the following requirements.

---

### High-level goal for this step

- Build a **two-column workspace** where:
  - Left column:
    - Displays the original resume content (structured or raw).
  - Right column:
    - Displays AI-generated suggestions grouped by section/bullet.
    - Allows the user to:
      - Accept
      - Reject
      - Inline-edit suggested text before accepting.
- Show the session’s:
  - Match score.
  - Strengths.
  - Gaps.
  - Keyword suggestions (from JD analysis / suggestions).

This UI should become the main place where users interact with the tailoring process.

---

### Routing & data loading

- Create a route: `/app/tailor/[sessionId]/page.tsx`.
- On load:
  - Fetch:
    - `TailoringSession` by `sessionId` (score + analysis).
    - Linked `Resume` (including `raw_text` and/or `parsed_json`).
    - Linked `JobDescription` (JD requirements, optional to display).
    - All `Suggestion` records for this session.
  - You may create a dedicated API endpoint, e.g.:
    - `GET /app/api/tailor/session/[id]`
    - Returns a combined payload:
      - `session`
      - `resume`
      - `job_description`
      - `suggestions[]`

---

### UI layout

- Use `shadcn/ui` components and Tailwind classes to create:
  - **Header area**:
    - Session title (e.g. “Tailoring for {Role} at {Company}” if available).
    - Score badge (e.g. 82% match).
    - Quick summary of strengths and gaps (lists or pills).
  - **Main body**: two responsive columns (stack on small screens).

- **Left column: Original Resume**
  - Show either:
    - Structured sections (Summary, Experience, Skills, Education, Projects) if `parsed_json` is available, or
    - Cleaned `raw_text` with basic headings if not.
  - Use a `Card` with a scrollable container.
  - Highlight lines/bullets that have associated suggestions (optional in this step; can be a later enhancement).

- **Right column: Suggestions**
  - Group suggestions by `type` and/or by mapped section:
    - Summary rewrites at top.
    - Bullet rewrites grouped by experience section.
    - Keyword additions and skills adjustments grouped below.
  - For each suggestion:
    - Show:
      - `type` (pill/badge).
      - `original_text` (small text, perhaps muted).
      - `suggested_text` in a `Textarea` or editable area (so user can tweak).
      - `rationale` (short explanation, possibly in a collapsible/tooltip).
    - Controls:
      - **Accept** button:
        - Calls PATCH `/api/suggestions/[id]` with `accepted: true`.
      - **Reject** button:
        - Calls PATCH `/api/suggestions/[id]` with `accepted: false`.
      - Visual state for accepted vs rejected (e.g. border color or icon).

---

### State management & UX details

- Distinguish suggestion states:
  - `pending` (not yet decided).
  - `accepted` (green border, check icon).
  - `rejected` (grey/red border, strikethrough or badge).

- When the user edits the `suggested_text`:
  - Keep local state in the component.
  - On Accept:
    - Send the **edited** text as part of the PATCH request payload:
      - e.g. `{ accepted: true, suggested_text: editedText }`.
    - Update the UI with the server response.

- Handle loading and error states for:
  - Initial data load.
  - Patch requests.

---

### Components (optional but recommended)

- Add reusable components under `/components`, for example:
  - `ScoreCard` — displays match score, strengths, gaps summary.
  - `SuggestionCard` — displays a single suggestion with controls.
  - `TailorEditor` — orchestrates the left/right layout and wiring.
  - `ResumeViewer` — read-only rendering of resume text/JSON.

These components should be generic enough to be reused in other views if needed.

---

### Guardrails & design considerations

- Make sure the UI does **not** imply that suggestions are already applied to the resume:
  - Clearly label suggested content vs original.
  - Clearly show what has been accepted.
- Avoid clutter:
  - Use collapsible sections if there are many suggestions.
  - Use tabs or filters (e.g. All / Summary / Bullets / Keywords) if needed.

---

### What to output / verify

- Confirm:
  - The `/tailor/[sessionId]` route and its data-loading strategy.
  - The layout and major components.
  - Accept/reject/edit flows work end-to-end.
- Manual test:
  - Run a full flow:
    - Upload resume → parse JD → run tailoring → generate suggestions.
    - Open tailoring workspace for that session.
    - Accept/reject several suggestions.
    - Refresh the page and see persisted states.

