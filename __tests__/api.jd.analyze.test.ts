/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/jd/analyze/route";

const mockAnalyze = jest.fn();

jest.mock("@/lib/openai", () => ({
  analyzeJobDescription: (...args: unknown[]) => mockAnalyze(...args)
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    jobDescription: {
      create: jest.fn().mockResolvedValue({
        id: "jd-1",
        title: "Engineer",
        company: "Acme",
        rawText: "We need React.",
        requirementsJson: {},
        createdAt: new Date()
      })
    }
  }
}));

describe("POST /api/jd/analyze", () => {
  beforeEach(() => {
    mockAnalyze.mockResolvedValue({
      required_skills: ["React"],
      preferred_skills: ["TypeScript"],
      responsibilities: ["Build UIs"],
      seniority_level: "Mid-level",
      domain_keywords: ["frontend"]
    });
  });

  it("returns 400 when raw_text is missing", async () => {
    const req = new NextRequest("http://localhost/api/jd/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Engineer", company: "Acme" })
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/raw_text/);
  });

  it("returns 400 when raw_text is empty string", async () => {
    const req = new NextRequest("http://localhost/api/jd/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Engineer", company: "Acme", raw_text: "   " })
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 and job_description_id + requirements when valid", async () => {
    const req = new NextRequest("http://localhost/api/jd/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Engineer",
        company: "Acme",
        raw_text: "We need React and TypeScript."
      })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.job_description_id).toBe("jd-1");
    expect(data.requirements).toEqual(
      expect.objectContaining({
        required_skills: ["React"],
        preferred_skills: ["TypeScript"],
        seniority_level: "Mid-level"
      })
    );
    expect(mockAnalyze).toHaveBeenCalledWith("We need React and TypeScript.");
  });
});
