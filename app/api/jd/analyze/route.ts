import { NextRequest, NextResponse } from "next/server";

import { analyzeJobDescription } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const company =
      typeof body.company === "string" ? body.company.trim() : "";
    const raw_text =
      typeof body.raw_text === "string" ? body.raw_text.trim() : "";

    if (!raw_text) {
      return NextResponse.json(
        { error: "raw_text is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const requirements = await analyzeJobDescription(raw_text);

    const jobDescription = await prisma.jobDescription.create({
      data: {
        title: title || "Untitled",
        company: company || "Unknown",
        rawText: raw_text,
        requirementsJson: requirements as unknown as Record<string, unknown>
      }
    });

    return NextResponse.json({
      job_description_id: jobDescription.id,
      requirements
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during JD analysis.";
    console.error("[jd/analyze]", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
