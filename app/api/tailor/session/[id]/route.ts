import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Temporary extended type until `npx prisma generate` is run locally.
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

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    const session = await db.tailoringSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
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
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }
    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session: {
        id: session.id,
        resume_id: session.resumeId,
        job_description_id: session.jobDescriptionId,
        score: session.score,
        analysis: session.analysisJson,
        created_at: session.createdAt
      },
      resume: {
        id: resume.id,
        filename: resume.filename,
        file_url: resume.fileUrl,
        raw_text: resume.rawText,
        parsed_json: resume.parsedJson,
        created_at: resume.createdAt
      },
      job_description: {
        id: jobDescription.id,
        title: jobDescription.title,
        company: jobDescription.company,
        raw_text: jobDescription.rawText,
        requirements_json: jobDescription.requirementsJson,
        created_at: jobDescription.createdAt
      },
      suggestions: suggestions.map((s) => ({
        id: s.id,
        session_id: s.sessionId,
        type: s.type,
        original_text: s.originalText,
        suggested_text: s.suggestedText,
        rationale: s.rationale,
        jd_mapping: s.jdMapping,
        accepted: s.accepted,
        created_at: s.createdAt
      }))
    });
  } catch (error) {
    console.error("[tailor/session]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Failed to load tailoring session."
      },
      { status: 500 }
    );
  }
}

