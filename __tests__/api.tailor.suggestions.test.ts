/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/tailor/suggestions/route";

jest.mock("@/lib/openai", () => ({
  generateSuggestions: jest.fn().mockResolvedValue([
    {
      type: "summary_rewrite",
      original_text: "Summary",
      suggested_text: "Better summary",
      rationale: "Aligns with JD",
      jd_mapping: ["required_skills:react"]
    }
  ])
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    resume: {
      findUnique: jest.fn().mockResolvedValue({
        id: "r1",
        rawText: "React developer",
        parsedJson: null
      })
    },
    tailoringSession: {
      findUnique: jest.fn().mockResolvedValue({
        id: "s1",
        resumeId: "r1",
        jobDescriptionId: "j1",
        analysisJson: {}
      })
    },
    jobDescription: {
      findUnique: jest.fn().mockResolvedValue({
        id: "j1",
        requirementsJson: {
          required_skills: ["React"],
          preferred_skills: [],
          responsibilities: [],
          seniority_level: "Mid",
          domain_keywords: []
        }
      })
    },
    suggestion: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: "sg1",
          sessionId: "s1",
          type: "summary_rewrite",
          originalText: "Summary",
          suggestedText: "Better summary",
          rationale: "Aligns with JD",
          jdMapping: ["required_skills:react"],
          accepted: false,
          createdAt: new Date()
        }
      ])
    }
  }
}));

describe("POST /api/tailor/suggestions", () => {
  it("returns 400 when session_id is missing", async () => {
    const req = new NextRequest("http://localhost/api/tailor/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns suggestions for a valid session_id", async () => {
    const req = new NextRequest("http://localhost/api/tailor/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: "s1" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.session_id).toBe("s1");
    expect(Array.isArray(data.suggestions)).toBe(true);
    expect(data.suggestions[0].id).toBe("sg1");
  });
});

