import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobDescriptions = await prisma.jobDescription.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, company: true, createdAt: true }
    });
    return NextResponse.json(jobDescriptions);
  } catch (error) {
    console.error("[jd/list]", error);
    return NextResponse.json(
      { error: "Failed to list job descriptions." },
      { status: 500 }
    );
  }
}
