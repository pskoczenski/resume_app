import OpenAI from "openai";

export interface JDAnalysisResult {
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  seniority_level: string;
  domain_keywords: string[];
}

const JD_EXTRACTION_SYSTEM = `You are a precise analyst. Given a job description, extract structured data and respond with ONLY a single JSON object. No markdown, no code fences, no commentary.

Output exactly this shape (all arrays may be empty if not found):
{
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1"],
  "responsibilities": ["responsibility1"],
  "seniority_level": "e.g. Mid-level, Senior, etc.",
  "domain_keywords": ["keyword1", "keyword2"]
}

Rules:
- Use only what is stated or clearly implied in the job description.
- Do not invent tools, technologies, or requirements that are not mentioned.
- If uncertain, return your best-guess arrays; do not invent irrelevant tools or technologies.`;

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.startsWith("sk-your-")) return null;
  return new OpenAI({ apiKey: key });
}

export async function analyzeJobDescription(
  rawText: string
): Promise<JDAnalysisResult> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI API key is not configured.");
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: JD_EXTRACTION_SYSTEM },
      {
        role: "user",
        content: `Extract structured requirements from this job description:\n\n${rawText}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2
  });

  const content = completion.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI returned no content.");
  }

  const trimmed = content.trim();
  const jsonStr =
    trimmed.startsWith("```") && trimmed.endsWith("```")
      ? trimmed.replace(/^```\w*\n?|\n?```$/g, "").trim()
      : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr) as unknown;
  } catch {
    throw new Error("OpenAI response was not valid JSON.");
  }

  const obj = parsed as Record<string, unknown>;
  const result: JDAnalysisResult = {
    required_skills: Array.isArray(obj.required_skills)
      ? obj.required_skills.filter((s): s is string => typeof s === "string")
      : [],
    preferred_skills: Array.isArray(obj.preferred_skills)
      ? obj.preferred_skills.filter((s): s is string => typeof s === "string")
      : [],
    responsibilities: Array.isArray(obj.responsibilities)
      ? obj.responsibilities.filter((s): s is string => typeof s === "string")
      : [],
    seniority_level:
      typeof obj.seniority_level === "string" ? obj.seniority_level : "",
    domain_keywords: Array.isArray(obj.domain_keywords)
      ? obj.domain_keywords.filter((s): s is string => typeof s === "string")
      : []
  };

  return result;
}
