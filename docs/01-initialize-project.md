## Step 1 — Initialize Next.js Project

Use this prompt when you are ready to create the initial Next.js 14+ app with TypeScript, Tailwind, and shadcn/ui, plus basic layout and navigation for the resume tailoring app.

---

### Prompt for the AI coding agent

You are working in a fresh repository for a project called **RoleTune**, a resume tailoring app.  
Follow this spec and implement **only Step 1 (Initialize Next.js project)**. We will build later steps separately.

**High-level goal for this step**

- Create a Next.js 14+ app (React 18, TypeScript) with:
  - Tailwind CSS configured.
  - `shadcn/ui` installed and ready for use.
  - A basic app layout and navigation shell.
  - A simple landing/dashboard page to verify everything is wired up.

**Key constraints**

- Use the **App Router** in Next.js.
- Use **TypeScript** everywhere.
- Use **Tailwind CSS** for styling.
- Prepare the project so later steps can add:
  - `/app/dashboard`
  - `/app/upload`
  - `/app/analysis`
  - `/app/tailor`
  - API routes under `/app/api/...`.
- Do not implement database access, AI calls, or file upload yet.

---

### Detailed requirements

- **Initialize project**
  - If not already done, run something equivalent to:
    - `npx create-next-app@latest . --ts --app --src-dir --no-eslint --no-tailwind --import-alias "@/*"`
  - Then add Tailwind manually following Next.js docs, or use the Tailwind option in the initializer if allowed.

- **Tailwind CSS**
  - Configure `tailwind.config` to scan `app`, `components`, and `lib`.
  - Add a base theme that will pair well with `shadcn/ui`.

- **shadcn/ui**
  - Install `shadcn/ui` for Next.js App Router.
  - Generate at least:
    - `button` component
    - `card` component
    - `input` component
    - `textarea` component
    - `badge` and `alert` (or similar) for future use.

- **App layout**
  - Create a root layout in `app/layout.tsx` with:
    - App shell using Tailwind classes.
    - A simple top navigation or side navigation that anticipates:
      - Dashboard
      - Upload
      - Analysis
      - Tailor
    - A basic global font and background.

- **Dashboard page**
  - Implement `app/page.tsx` (or `app/dashboard/page.tsx`) as a simple dashboard placeholder:
    - Welcome text.
    - Short description of what the app will do.
    - Buttons/links to:
      - “Upload Resume”
      - “Start Tailoring”
      (Links can point to placeholder routes for now.)

- **Project hygiene**
  - Set up a basic `.gitignore` appropriate for Node/Next.js.
  - Ensure scripts in `package.json` include:
    - `dev`
    - `build`
    - `start`
    - `lint` (optional if ESLint added).

---

### What to output / verify

- Confirm the project runs with:
  - `pnpm install` (or `npm install`/`yarn` depending on package manager).
  - `pnpm dev` starts the dev server on `http://localhost:3000`.
- Describe:
  - The created layout structure.
  - The main components and pages.
  - How to extend navigation for future steps.

- Do **not** implement any backend logic, database, AI integration, or file uploads in this step. That will be covered in later docs.

