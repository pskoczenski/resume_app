/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/export/docx/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    resume: {
      findUnique: jest.fn()
    },
    jobDescription: {
      findUnique: jest.fn()
    },
    tailoringSession: {
      findUnique: jest.fn()
    },
    suggestion: {
      findMany: jest.fn()
    }
  }
}));

describe("POST /api/export/docx", () => {
  it("returns a downloadable .docx", async () => {
    const { prisma } = jest.requireMock("@/lib/prisma") as any;

    prisma.tailoringSession.findUnique.mockResolvedValue({
      id: "session-1",
      resumeId: "r1",
      jobDescriptionId: "j1",
      score: 0.82,
      analysisJson: {},
      createdAt: new Date()
    });
    prisma.resume.findUnique.mockResolvedValue({
      id: "r1",
      filename: "resume.pdf",
      fileUrl: "https://example.com/resume.pdf",
      rawText: "Summary line\n- Built internal tools",
      parsedJson: null,
      createdAt: new Date()
    });
    prisma.jobDescription.findUnique.mockResolvedValue({
      id: "j1",
      title: "Frontend Engineer",
      company: "Acme",
      rawText: "JD",
      requirementsJson: {
        required_skills: ["React"],
        preferred_skills: [],
        responsibilities: [],
        seniority_level: "mid",
        domain_keywords: ["B2B SaaS"],
        education_requirements: [],
        soft_skills: []
      },
      createdAt: new Date()
    });
    prisma.suggestion.findMany.mockResolvedValue([
      {
        id: "s1",
        sessionId: "session-1",
        type: "summary_rewrite",
        originalText: "Summary line",
        suggestedText: "Tailored summary",
        rationale: "Better alignment",
        jdMapping: [],
        accepted: true,
        createdAt: new Date()
      }
    ]);

    const req = new NextRequest("http://localhost/api/export/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: "session-1" })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(res.headers.get("Content-Disposition")).toContain(".docx");

    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(50);
    // DOCX is a zip container; should start with "PK"
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});

