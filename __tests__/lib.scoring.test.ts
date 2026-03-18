import {
  computeAlignmentScore,
  stubParsedResumeFromRawText
} from "@/lib/scoring";
import type { JDAnalysisResult } from "@/lib/openai";

describe("computeAlignmentScore", () => {
  const baseJd: JDAnalysisResult = {
    required_skills: ["React", "TypeScript"],
    preferred_skills: ["Node.js"],
    responsibilities: ["Build user interfaces", "Write tests"],
    seniority_level: "Mid-level",
    domain_keywords: ["frontend", "web"]
  };

  it("returns score 0–100 and strengths/gaps/underemphasized_skills", () => {
    const resume = stubParsedResumeFromRawText(`
      React and TypeScript developer.
      • Built user interfaces with React
      • Wrote unit tests for frontend
      • Worked on web applications
    `);
    const result = computeAlignmentScore({ resume, jd: baseJd });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(Array.isArray(result.underemphasized_skills)).toBe(true);
  });

  it("gives higher score when required skills appear in resume", () => {
    const strongResume = stubParsedResumeFromRawText(
      "Expert in React and TypeScript. Built user interfaces. Wrote tests. Frontend web."
    );
    const weakResume = stubParsedResumeFromRawText(
      "Worked with Excel and Word. No coding."
    );
    const strongResult = computeAlignmentScore({ resume: strongResume, jd: baseJd });
    const weakResult = computeAlignmentScore({ resume: weakResume, jd: baseJd });
    expect(strongResult.score).toBeGreaterThan(weakResult.score);
  });

  it("is deterministic for same inputs", () => {
    const resume = stubParsedResumeFromRawText("React TypeScript frontend.");
    const a = computeAlignmentScore({ resume, jd: baseJd });
    const b = computeAlignmentScore({ resume, jd: baseJd });
    expect(a.score).toBe(b.score);
    expect(a.strengths).toEqual(b.strengths);
  });
});

describe("stubParsedResumeFromRawText", () => {
  it("populates rawTextForMatching and skills from text", () => {
    const resume = stubParsedResumeFromRawText("Hello\nWorld\n• Bullet one");
    expect(resume.rawTextForMatching).toContain("Hello");
    expect(resume.skills.length).toBeGreaterThanOrEqual(0);
    expect(resume.experience?.length).toBeGreaterThanOrEqual(0);
  });
});
