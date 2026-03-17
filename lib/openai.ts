import OpenAI from "openai";
import type { AlignmentResult, ParsedResume } from "@/lib/scoring";

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

export type SuggestionType =
  | "summary_rewrite"
  | "bullet_rewrite"
  | "keyword_addition"
  | "skills_adjustment"
  | "section_feedback";

export interface GeneratedSuggestion {
  type: SuggestionType;
  original_text: string;
  suggested_text: string;
  rationale: string;
  jd_mapping?: unknown;
}

const SUGGESTIONS_SYSTEM = `You are an expert resume editor and ATS alignment assistant.

CRITICAL GUARDRAILS:
- Never invent experience, companies, projects, job titles, dates, certifications, or tools not present in the resume.
- Never add years of experience or management scope that is not explicitly present.
- You may ONLY rephrase, reorder, or emphasize content that already exists in the resume.
- If the job description mentions a tool/keyword not found in the resume, you may suggest it ONLY as a keyword/ATS suggestion (not as claimed experience) unless the resume already implies it.

Return ONLY valid JSON. No markdown, no commentary.`;

function safeJsonParse(content: string): unknown {
  const trimmed = content.trim();
  const jsonStr =
    trimmed.startsWith("```") && trimmed.endsWith("```")
      ? trimmed.replace(/^```\w*\n?|\n?```$/g, "").trim()
      : trimmed;
  return JSON.parse(jsonStr);
}

export async function generateSuggestions(args: {
  resume: ParsedResume;
  jd: JDAnalysisResult;
  analysis: AlignmentResult;
}): Promise<GeneratedSuggestion[]> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI API key is not configured.");
  }

  const { resume, jd, analysis } = args;

  const userPayload = {
    resume,
    job_description: jd,
    analysis: {
      strengths: analysis.strengths,
      gaps: analysis.gaps,
      underemphasized_skills: analysis.underemphasized_skills,
      score: analysis.score
    },
    output_format: {
      suggestions: [
        {
          type: "bullet_rewrite",
          original_text: "string",
          suggested_text: "string",
          rationale: "string",
          jd_mapping: ["required_skills:react", "responsibility:build_ui"]
        }
      ]
    }
  };

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SUGGESTIONS_SYSTEM },
      {
        role: "user",
        content:
          "Generate resume tailoring suggestions using ONLY the provided resume content. " +
          "Include summary rewrites and bullet rewrites where beneficial, plus keyword/skills suggestions. " +
          "Each suggestion must include original_text, suggested_text, rationale, and jd_mapping.\n\n" +
          JSON.stringify(userPayload)
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3
  });

  const content = completion.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI returned no content.");
  }

  let parsed: unknown;
  try {
    parsed = safeJsonParse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON.");
  }

  const obj = parsed as Record<string, unknown>;
  const suggestionsRaw = obj.suggestions;
  if (!Array.isArray(suggestionsRaw)) {
    return [];
  }

  const allowedTypes = new Set<SuggestionType>([
    "summary_rewrite",
    "bullet_rewrite",
    "keyword_addition",
    "skills_adjustment",
    "section_feedback"
  ]);

  const suggestions: GeneratedSuggestion[] = suggestionsRaw
    .map((s) => s as Record<string, unknown>)
    .map((s) => ({
      type: String(s.type) as SuggestionType,
      original_text: typeof s.original_text === "string" ? s.original_text : "",
      suggested_text:
        typeof s.suggested_text === "string" ? s.suggested_text : "",
      rationale: typeof s.rationale === "string" ? s.rationale : "",
      jd_mapping: s.jd_mapping
    }))
    .filter(
      (s) =>
        allowedTypes.has(s.type) &&
        s.original_text.trim().length > 0 &&
        s.suggested_text.trim().length > 0 &&
        s.rationale.trim().length > 0
    );

  return suggestions;
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
