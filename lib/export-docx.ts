/**
 * Placeholder for future DOCX export.
 * Export content must be derived from original resume + accepted suggestions only (no fabrication).
 */

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";

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
export async function generateDocx(content: ExportContent): Promise<Buffer> {
  const summary = content.tailored_summary?.trim() ?? "";
  const bullets = Array.isArray(content.tailored_bullets)
    ? content.tailored_bullets.map((b) => String(b)).filter((b) => b.trim().length > 0)
    : [];
  const keywords = Array.isArray(content.keywords)
    ? content.keywords.map((k) => String(k)).filter((k) => k.trim().length > 0)
    : [];

  const children: Paragraph[] = [
    new Paragraph({ text: "RoleTune Export", heading: HeadingLevel.TITLE })
  ];

  children.push(
    new Paragraph({ text: "Tailored Summary", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({
      children: [new TextRun(summary.length ? summary : "")]
    })
  );

  children.push(new Paragraph({ text: "Updated Bullets", heading: HeadingLevel.HEADING_2 }));
  if (bullets.length) {
    for (const b of bullets) {
      children.push(
        new Paragraph({
          text: b,
          bullet: { level: 0 }
        })
      );
    }
  }

  children.push(
    new Paragraph({ text: "Keyword Suggestions", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({
      children: [new TextRun(keywords.join(", "))]
    })
  );

  const doc = new Document({
    sections: [{ children }]
  });

  return await Packer.toBuffer(doc);
}
