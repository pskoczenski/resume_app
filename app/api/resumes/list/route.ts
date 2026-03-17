import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const resumes = await prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, createdAt: true }
    });
    return NextResponse.json(resumes);
  } catch (error) {
    console.error("[resumes/list]", error);
    return NextResponse.json(
      { error: "Failed to list resumes." },
      { status: 500 }
    );
  }
}
