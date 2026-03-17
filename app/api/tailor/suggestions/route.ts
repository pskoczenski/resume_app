import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { JDAnalysisResult } from "@/lib/openai";
import { generateSuggestions } from "@/lib/openai";
import { computeAlignmentScore, toParsedResume } from "@/lib/scoring";

// Temporary extended type until `npx prisma generate` is run locally.
const db = prisma as typeof prisma & {
  tailoringSession: {
    findUnique: (args: { where: { id: string } }) => Promise<{
      id: string;
      resumeId: string;
      jobDescriptionId: string;
      analysisJson: unknown;
    } | null>;
  };
  jobDescription: {
    findUnique: (args: { where: { id: string } }) => Promise<{
      id: string;
      requirementsJson: unknown;
    } | null>;
  };
  suggestion: {
    createMany: (args: {
      data: Array<{
        sessionId: string;
        type: string;
        originalText: string;
        suggestedText: string;
        rationale: string;
        jdMapping?: unknown;
        accepted?: boolean;
      }>;
    }) => Promise<{ count: number }>;
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
    const session_id =
      typeof body.session_id === "string" ? body.session_id.trim() : "";

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required." },
        { status: 400 }
      );
    }

    const session = await db.tailoringSession.findUnique({
      where: { id: session_id }
    });
    if (!session) {
      return NextResponse.json(
        { error: "Tailoring session not found." },
        { status: 404 }
      );
    }

    const [resume, jobDescription] = await Promise.all([
      prisma.resume.findUnique({ where: { id: session.resumeId } }),
      db.jobDescription.findUnique({ where: { id: session.jobDescriptionId } })
    ]);

    if (!resume) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }
    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description not found." },
        { status: 404 }
      );
    }

    const parsedResume = toParsedResume(resume.rawText, resume.parsedJson);
    const jd = jobDescription.requirementsJson as unknown as JDAnalysisResult;

    // Recompute analysis deterministically to drive suggestions.
    const analysis = computeAlignmentScore({ resume: parsedResume, jd });

    const suggestions = await generateSuggestions({
      resume: parsedResume,
      jd,
      analysis
    });

    if (suggestions.length > 0) {
      await db.suggestion.createMany({
        data: suggestions.map((s) => ({
          sessionId: session.id,
          type: s.type,
          originalText: s.original_text,
          suggestedText: s.suggested_text,
          rationale: s.rationale,
          jdMapping: s.jd_mapping ?? null,
          accepted: false
        }))
      });
    }

    const saved = await db.suggestion.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({
      session_id: session.id,
      suggestions: saved.map((s) => ({
        id: s.id,
        session_id: s.sessionId,
        type: s.type,
        original_text: s.originalText,
        suggested_text: s.suggestedText,
        rationale: s.rationale,
        jd_mapping: s.jdMapping,
        accepted: s.accepted
      }))
    });
  } catch (error) {
    console.error("[tailor/suggestions]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Failed to generate suggestions."
      },
      { status: 500 }
    );
  }
}

