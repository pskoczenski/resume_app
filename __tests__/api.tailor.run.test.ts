/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/tailor/run/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    resume: {
      findUnique: jest.fn().mockResolvedValue(null)
    },
    jobDescription: {
      findUnique: jest.fn().mockResolvedValue(null)
    },
    tailoringSession: {
      create: jest.fn()
    }
  }
}));

describe("POST /api/tailor/run", () => {
  it("returns 400 when resume_id or jd_id is missing", async () => {
    const req = new NextRequest("http://localhost/api/tailor/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const req2 = new NextRequest("http://localhost/api/tailor/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: "r1" })
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });

  it("returns 404 when resume or JD not found", async () => {
    const req = new NextRequest("http://localhost/api/tailor/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: "r1", jd_id: "j1" })
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 200 and session when resume and JD exist", async () => {
    const { prisma } = await import("@/lib/prisma");
    const db = prisma as typeof prisma & {
      jobDescription: { findUnique: jest.Mock };
      tailoringSession: { create: jest.Mock };
    };
    (prisma.resume.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "r1",
      rawText: "React developer",
      parsedJson: null
    });
    db.jobDescription.findUnique.mockResolvedValueOnce({
      id: "j1",
      requirementsJson: {
        required_skills: ["React"],
        preferred_skills: [],
        responsibilities: [],
        seniority_level: "Mid",
        domain_keywords: []
      }
    });
    db.tailoringSession.create.mockResolvedValueOnce({
      id: "session-1",
      score: 50,
      analysisJson: {}
    });

    const req = new NextRequest("http://localhost/api/tailor/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: "r1", jd_id: "j1" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.session_id).toBe("session-1");
    expect(typeof data.score).toBe("number");
    expect(Array.isArray(data.strengths)).toBe(true);
    expect(Array.isArray(data.gaps)).toBe(true);
    expect(Array.isArray(data.underemphasized_skills)).toBe(true);
  });
});
