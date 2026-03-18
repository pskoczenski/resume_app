/**
 * Placeholder for future DOCX export.
 * Export content must be derived from original resume + accepted suggestions only (no fabrication).
 */

export type ExportContent = {
  tailored_summary: string;
  tailored_bullets: string[];
  keywords: string[];
};

/**
 * TODO: Implement DOCX generation.
 * - Use a library such as docx or docx-templates to build a .docx from ExportContent.
 * - Ensure all content comes from tailored_summary, tailored_bullets, and keywords (no new inferred claims).
 * - Return a Buffer or Blob for download.
 */
export async function generateDocx(_content: ExportContent): Promise<Buffer> {
  throw new Error("DOCX export not implemented yet.");
}
