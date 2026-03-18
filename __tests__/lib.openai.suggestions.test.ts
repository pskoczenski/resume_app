import { generateSuggestions } from "@/lib/openai";
import type { AlignmentResult, ParsedResume } from "@/lib/scoring";
import type { JDAnalysisResult } from "@/lib/openai";

const mockCreate = jest.fn();

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }));
});

const originalEnv = process.env;

describe("generateSuggestions", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test-key" };
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  type: "bullet_rewrite",
                  original_text: "Built internal UI tools.",
                  suggested_text:
                    "Built internal UI tools in React and TypeScript to improve team workflows.",
                  rationale:
                    "Adds keywords from the JD and clarifies impact without inventing new experience.",
                  jd_mapping: ["required_skills:react", "preferred_skills:typescript"]
                }
              ]
            })
          }
        }
      ]
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns parsed suggestions and includes guardrails in prompt", async () => {
    const resume: ParsedResume = {
      skills: ["React", "TypeScript"],
      experience: [
        { company: "Acme", role: "Engineer", bullets: ["Built internal UI tools."] }
      ],
      rawTextForMatching: "Built internal UI tools."
    };
    const jd: JDAnalysisResult = {
      required_skills: ["React"],
      preferred_skills: ["TypeScript"],
      responsibilities: ["Build UIs"],
      seniority_level: "Mid-level",
      domain_keywords: ["frontend"]
    };
    const analysis: AlignmentResult = {
      score: 80,
      strengths: ["React experience"],
      gaps: ["Missing A/B testing"],
      underemphasized_skills: ["TypeScript"]
    };

    const suggestions = await generateSuggestions({ resume, jd, analysis });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe("bullet_rewrite");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Never invent experience")
          })
        ])
      })
    );
  });
});

