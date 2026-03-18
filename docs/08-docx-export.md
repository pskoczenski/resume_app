## Step 8 — DOCX Export (Downloadable Resume Snippet)

Use this prompt when you are ready to implement **DOCX generation** for exported tailored content (summary, bullets, keywords). This step assumes Steps 1–7 are complete.

---

### Prompt for the AI coding agent

You are working in an existing Next.js 14+ (App Router, TypeScript) project for a resume tailoring app called **RoleTune**.

Steps 1–7 are complete:
- Resume upload + JD extraction + alignment scoring + suggestions + tailoring workspace.
- Export screen at `/export/[sessionId]` that calls `POST /api/export` and shows copyable summary/bullets/keywords.
- A placeholder file exists at `lib/export-docx.ts`.

Now implement **Step 8: DOCX export** according to the following requirements.

---

### High-level goal for this step

- Add a “Download DOCX” capability that produces a `.docx` file for a given `TailoringSession`.
- The DOCX content must be derived **only** from:
  - The original resume content, and
  - **Accepted** suggestions already stored
- No new inferred claims. No fabrication.

---

### Recommended approach (why)

Use the npm package **`docx`** to generate `.docx` files server-side.

Why `docx`:
- Widely used TypeScript-friendly library for building Word documents programmatically.
- Produces a valid Office Open XML `.docx` (zip container) without needing Word installed.
- Works well in a Next.js **Node runtime** route returning a `Buffer`.

Avoid browser-only generation for this step:
- The browser build can bloat bundles and introduce edge/runtime constraints.
- Server-side generation provides consistent file output and simpler tests.

---

### Backend: DOCX download route

Create a new route:
- `POST /app/api/export/docx`

Input JSON:
- `session_id: string`

Behavior:
1. Call the existing export assembly logic (the same data that powers `/api/export`) to produce:
   - `tailored_summary: string`
   - `tailored_bullets: string[]`
   - `keywords: string[]`
2. Generate a `.docx` using `docx` with this structure:
   - Document title: “RoleTune Export”
   - Section: “Tailored Summary”
     - Paragraph containing the `tailored_summary`
   - Section: “Updated Bullets”
     - Bulleted list for `tailored_bullets`
   - Section: “Keyword Suggestions”
     - A paragraph containing comma-separated keywords or a multi-column-ish line-wrapped list

Response:
- Status 200
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename=\"roletune-export-<session_id>.docx\"`
- Body: `Buffer`/binary docx bytes

Runtime:
- Ensure the route is Node runtime (DOCX generation is not Edge-friendly):
  - `export const runtime = \"nodejs\";`

Error handling:
- For missing/invalid `session_id`: 400
- For missing session: 404
- For other failures: 500 with dev-friendly error in development

Guardrail:
- The docx generator must only format and arrange the export payload.
- It must not introduce any new resume claims.

---

### Frontend: Export screen “Download DOCX”

Update `/app/export/[sessionId]/page.tsx`:
- Add a “Download DOCX” button (as a top-level action).
- On click:
  1. `fetch(\"/api/export/docx\", { method: \"POST\", body: JSON.stringify({ session_id }) })`
  2. Read response as `Blob`
  3. Create an object URL and click a temporary `<a download>` link
  4. Revoke the object URL

UX:
- Show a loading state while the download is being prepared.
- If it fails, show an error message and keep the copy-to-clipboard export working.

Optional:
- If you already have a disabled “Export DOCX (coming soon)” button, replace it with the real download button.

---

### `lib/export-docx.ts`

Implement `generateDocx(content: ExportContent): Promise<Buffer>` using `docx`.

Implementation details (suggested):
- Use:
  - `new Document({ sections: [...] })`
  - `new Paragraph({ text, heading: HeadingLevel.HEADING_2 })` for headings
  - Bulleted list paragraphs using `bullet: { level: 0 }`
  - `Packer.toBuffer(doc)` to return a `Buffer`

Keep formatting simple:
- Consistent headings
- Normal font sizes
- Bullets for bullets
- No images, no tables, no complicated layout (yet)

---

### Tests

Add tests for:

#### API route test (`__tests__/api.export.docx.test.ts`)
- Mock Prisma reads as needed (similar pattern to other API tests).
- Call the route handler with a valid `session_id`.
- Assert:
  - Status is 200
  - `Content-Type` is DOCX MIME type
  - `Content-Disposition` contains `.docx`
  - Response body is non-empty
  - Optional sanity check: `.docx` is a zip → first two bytes are `PK`

#### Export screen test (`__tests__/app.export.page.test.tsx`)
- Render `/export/[sessionId]` page (mocking the `/api/export` fetch as in Step 7 tests).
- Mock `fetch` for `/api/export/docx` to return a Blob.
- Mock `URL.createObjectURL`, `URL.revokeObjectURL`, and anchor click.
- Assert the “Download DOCX” button is present and triggers the download flow.

---

### Manual test plan

- Create a tailoring session with a few accepted suggestions.
- Visit `/export/<session_id>`.
- Click “Download DOCX”.
- Open the downloaded file in Word/Google Docs:
  - Summary, bullets, and keywords should match the export UI.
  - No unexpected/invented content.

