import { NextRequest } from "next/server";

import type { JDAnalysisResult } from "@/lib/openai";
import { generateDocx } from "@/lib/export-docx";
import { prisma } from "@/lib/prisma";
import { toParsedResume } from "@/lib/scoring";

export const runtime = "nodejs";

// Export content is derived from original resume/JD + accepted suggestions only (no fabrication).

const db = prisma as typeof prisma & {
  tailoringSession: {
    findUnique: (args: { where: { id: string } }) => Promise<{
      id: string;
      resumeId: string;
      jobDescriptionId: string;
      score: number;
      analysisJson: unknown;
      createdAt: Date;
    } | null>;
  };
  jobDescription: {
    findUnique: (args: { where: { id: string } }) => Promise<{
      id: string;
      title: string;
      company: string;
      rawText: string;
      requirementsJson: unknown;
      createdAt: Date;
    } | null>;
  };
  suggestion: {
    findMany: (args: {
      where: { sessionId: string };
      orderBy: { createdAt: "asc" | "desc" };
    }) => Promise<
      Array<{
        id: string;
        sessionId: string;
        type: string;
        originalText: string;
        suggestedText: string;
        rationale: string;
        jdMapping: unknown;
        accepted: boolean;
        createdAt: Date;
      }>
    >;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId =
      typeof body?.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const session = await db.tailoringSession.findUnique({
      where: { id: sessionId }
    });
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const [resume, jobDescription, suggestions] = await Promise.all([
      prisma.resume.findUnique({ where: { id: session.resumeId } }),
      db.jobDescription.findUnique({ where: { id: session.jobDescriptionId } }),
      db.suggestion.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "asc" }
      })
    ]);

    if (!resume) {
      return new Response(JSON.stringify({ error: "Resume not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: "Job description not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const parsed = toParsedResume(resume.rawText, resume.parsedJson);
    const jd = (jobDescription.requirementsJson ?? {}) as JDAnalysisResult;
    const accepted = suggestions.filter((s) => s.accepted);

    let tailoredSummary =
      typeof parsed.summary === "string" ? parsed.summary : "";
    const summaryRewrites = accepted
      .filter((s) => s.type === "summary_rewrite")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    if (summaryRewrites.length > 0) {
      tailoredSummary = summaryRewrites[0].suggestedText;
    }

    const bulletRewrites = new Map(
      accepted
        .filter((s) => s.type === "bullet_rewrite")
        .map((s) => [s.originalText.trim(), s.suggestedText])
    );
    const allBullets: string[] = [];
    for (const exp of parsed.experience ?? []) {
      for (const b of exp.bullets ?? []) {
        const key = b.trim();
        allBullets.push(bulletRewrites.has(key) ? bulletRewrites.get(key)! : b);
      }
    }

    const jdSource = [
      ...(Array.isArray(jd.required_skills) ? jd.required_skills : []),
      ...(Array.isArray(jd.preferred_skills) ? jd.preferred_skills : []),
      ...(Array.isArray(jd.domain_keywords) ? jd.domain_keywords : [])
    ]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const fromSuggestions = accepted
      .filter(
        (s) => s.type === "keyword_addition" || s.type === "skills_adjustment"
      )
      .flatMap((s) =>
        s.suggestedText
          .split(/[\n,]+/)
          .map((t) => t.trim())
          .filter(Boolean)
      )
      .map((s) => s.toLowerCase());
    const seen = new Set<string>();
    const keywordList: string[] = [];
    for (const k of jdSource) {
      if (!seen.has(k)) {
        seen.add(k);
        keywordList.push(k);
      }
    }
    for (const k of fromSuggestions) {
      if (!seen.has(k)) {
        seen.add(k);
        keywordList.push(k);
      }
    }
    const keywords = keywordList.sort((a, b) => a.localeCompare(b));

    const docxBuffer = await generateDocx({
      tailored_summary: tailoredSummary,
      tailored_bullets: allBullets,
      keywords
    });

    return new Response(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="roletune-export-${sessionId}.docx"`
      }
    });
  } catch (error) {
    console.error("[export/docx]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "DOCX export failed."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

