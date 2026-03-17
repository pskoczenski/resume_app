import { NextRequest, NextResponse } from "next/server";

import {
  computeAlignmentScore,
  toParsedResume
} from "@/lib/scoring";
import type { JDAnalysisResult } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

// Use extended type until Prisma client is regenerated (npx prisma generate)
const db = prisma as typeof prisma & {
  jobDescription: { findUnique: (args: { where: { id: string } }) => Promise<{ id: string; requirementsJson: unknown } | null> };
  tailoringSession: { create: (args: { data: { resumeId: string; jobDescriptionId: string; score: number; analysisJson: object } }) => Promise<{ id: string; score: number }> };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resume_id =
      typeof body.resume_id === "string" ? body.resume_id.trim() : "";
    const jd_id =
      typeof body.jd_id === "string" ? body.jd_id.trim() : "";

    if (!resume_id || !jd_id) {
      return NextResponse.json(
        { error: "resume_id and jd_id are required." },
        { status: 400 }
      );
    }

    const [resume, jobDescription] = await Promise.all([
      prisma.resume.findUnique({
        where: { id: resume_id }
      }),
      db.jobDescription.findUnique({
        where: { id: jd_id }
      })
    ]);

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found." },
        { status: 404 }
      );
    }
    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description not found." },
        { status: 404 }
      );
    }

    const parsedResume = toParsedResume(
      resume.rawText,
      resume.parsedJson
    );
    const jd = jobDescription.requirementsJson as unknown as JDAnalysisResult;

    const result = computeAlignmentScore({
      resume: parsedResume,
      jd
    });

    const session = await db.tailoringSession.create({
      data: {
        resumeId: resume.id,
        jobDescriptionId: jobDescription.id,
        score: result.score,
        analysisJson: {
          strengths: result.strengths,
          gaps: result.gaps,
          underemphasized_skills: result.underemphasized_skills
        }
      }
    });

    return NextResponse.json({
      session_id: session.id,
      score: result.score,
      strengths: result.strengths,
      gaps: result.gaps,
      underemphasized_skills: result.underemphasized_skills
    });
  } catch (error) {
    console.error("[tailor/run]", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Failed to run alignment analysis."
      },
      { status: 500 }
    );
  }
}
