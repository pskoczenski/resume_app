import { analyzeJobDescription } from "@/lib/openai";

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

describe("analyzeJobDescription", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, OPENAI_API_KEY: "sk-test-key" };
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              required_skills: ["React"],
              preferred_skills: ["TypeScript"],
              responsibilities: ["Build UIs"],
              seniority_level: "Mid-level",
              domain_keywords: ["frontend"]
            })
          }
        }
      ]
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns structured JDAnalysisResult from OpenAI response", async () => {
    const result = await analyzeJobDescription("We need React and TypeScript.");

    expect(result).toEqual({
      required_skills: ["React"],
      preferred_skills: ["TypeScript"],
      responsibilities: ["Build UIs"],
      seniority_level: "Mid-level",
      domain_keywords: ["frontend"],
      education_requirements: [],
      soft_skills: []
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("We need React and TypeScript.")
          })
        ])
      })
    );
  });

  it("throws when OPENAI_API_KEY is not set", async () => {
    const key = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "";
    await expect(analyzeJobDescription("Some JD")).rejects.toThrow(/not configured/);
    process.env.OPENAI_API_KEY = key;
  });
});
