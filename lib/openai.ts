import OpenAI from "openai";
import type { AlignmentResult, ParsedResume } from "@/lib/scoring";

export interface JDAnalysisResult {
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  seniority_level: string;
  domain_keywords: string[];
  education_requirements: string[];
  soft_skills: string[];
}

const JD_EXTRACTION_SYSTEM = `You are a precise job-description analyst. Extract structured data and respond with ONLY a single JSON object. No markdown, no code fences, no commentary.

Output exactly this shape (all arrays may be empty if not found):
{
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1"],
  "responsibilities": ["responsibility1"],
  "seniority_level": "mid",
  "domain_keywords": ["keyword1"],
  "education_requirements": ["e.g. Bachelor's in CS or equivalent"],
  "soft_skills": ["e.g. cross-functional collaboration"]
}

Rules:
- required_skills: Only hard technical/tool skills explicitly required or strongly implied as core to the role.
- preferred_skills: Skills described as "nice to have", "a plus", or "preferred".
- responsibilities: Concrete job duties as written. Keep phrasing close to the original — this preserves ATS keyword signal.
- seniority_level: Normalize to one of: "entry", "mid", "senior", "staff", "principal", "manager", "director", or "" if unclear.
- domain_keywords: Industry/domain/context terms that are NOT tools or skills — e.g. "fintech", "HIPAA", "B2B SaaS", "distributed systems", "marketplace". These are ATS signal words.
- education_requirements: Stated degree, field, or equivalent experience requirements.
- soft_skills: Interpersonal or organizational traits explicitly mentioned (e.g. communication, leadership, ambiguity tolerance).
- Do not invent tools, technologies, or qualifications not present in the job description.
- If uncertain, leave fields empty rather than guessing.`;

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
  impact: "high" | "medium" | "low";
  improvement_type:
    | "keyword_alignment"
    | "clarity"
    | "specificity"
    | "relevance"
    | "summary_positioning"
    | "skills_reorganization";
  jd_mapping: string[];
}

const SUGGESTIONS_SYSTEM = `You are an expert resume editor and ATS alignment specialist.

Your goal is not to maximize the number of edits. Your goal is to produce only the highest-value resume improvements, in priority order.

PRIORITY ORDER — evaluate and generate suggestions in this order:
1. summary_rewrite — only if the summary is generic, misses the JD's seniority signals, or buries top required skills
2. bullet_rewrite — for bullets describing relevant experience that use weak verbs, lack specificity, or miss high-value JD keywords
3. keyword_addition — ONLY for required/preferred skills clearly implied by the resume but not explicitly stated
4. skills_adjustment — reorder or regroup existing skills to front-load JD matches
5. section_feedback — structural issues only (e.g. missing Projects section for an IC role, skills section placement)

Generate between 4 and 8 suggestions total. Prefer depth over quantity.
- Do not rewrite bullets that are already strong and well-aligned.
- If a section needs no changes, leave it alone entirely.
- For bullet_rewrite: mirror the JD's verb tense and phrasing where natural. Lead with impact. Quantify only if numbers exist in the original.
- For keyword_addition: only suggest a keyword if (a) the concept is evidenced in the resume but named differently, or (b) it belongs in a non-claiming skills section without overstating hands-on experience. If unsupported, do not suggest it.

CRITICAL GUARDRAILS:
- Never invent experience, companies, projects, job titles, dates, certifications, or tools not present in the resume.
- Never add years of experience or management scope not explicitly present.
- You may ONLY rephrase, reorder, clarify, or emphasize content already present in the resume.
- If a JD keyword is absent from the resume with no reasonable implication, note it as a gap in rationale — do not suggest adding it.

EXAMPLES:
BAD bullet_rewrite:
  original_text: "Built internal tools."
  suggested_text: "Led a team of 6 engineers building React analytics platforms for enterprise customers."
  reason: Invents team size, technology, and customer scope not present in the resume.

GOOD bullet_rewrite:
  original_text: "Built internal tools."
  suggested_text: "Built internal tooling that streamlined operational workflows and reduced manual overhead."
  reason: Improves specificity and impact framing using only what is implied by the original.

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
      priority_opportunities: [
        {
          area: "summary | bullet | keywords | skills | structure",
          reason: "string — why this is a high-value opportunity",
          impact: "high | medium | low"
        }
      ],
      suggestions: [
        {
          type: "bullet_rewrite",
          original_text: "string",
          suggested_text: "string",
          rationale: "string",
          impact: "high | medium | low",
          improvement_type:
            "keyword_alignment | clarity | specificity | relevance | summary_positioning | skills_reorganization",
          jd_mapping: ["required_skills:react", "responsibility:build_ui"]
        }
      ]
    }
  };

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SUGGESTIONS_SYSTEM },
      {
        role: "user",
        content:
          "Analyze the provided resume and structured job description. " +
          "Identify only the highest-value tailoring opportunities — do not try to maximize the number of edits. " +
          "Leave strong, well-aligned content untouched. " +
          "First, produce a priority_opportunities array identifying the top improvement areas and why. " +
          "Then produce suggestions grounded only in the provided resume content. " +
          "For each suggestion include: type, original_text, suggested_text, rationale, impact, improvement_type, and jd_mapping. " +
          "If a summary rewrite is unnecessary, omit it. If a bullet is already strong, do not rewrite it.\n\n" +
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
      impact: (["high", "medium", "low"].includes(s.impact as string)
        ? s.impact
        : "medium") as "high" | "medium" | "low",
      improvement_type: (typeof s.improvement_type === "string"
        ? s.improvement_type
        : "clarity") as GeneratedSuggestion["improvement_type"],
      jd_mapping: Array.isArray(s.jd_mapping)
        ? s.jd_mapping.filter((x): x is string => typeof x === "string")
        : []
    }))
    .filter(
      (s) =>
        allowedTypes.has(s.type) &&
        s.original_text.trim().length > 0 &&
        s.suggested_text.trim().length > 0 &&
        s.rationale.trim().length > 0 &&
        s.impact !== "low"  // discard low-impact suggestions at the source
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

  let parsed: unknown;
  try {
    parsed = safeJsonParse(content);
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
      : [],
    education_requirements: Array.isArray(obj.education_requirements)
      ? obj.education_requirements.filter((s): s is string => typeof s === "string")
      : [],
    soft_skills: Array.isArray(obj.soft_skills)
      ? obj.soft_skills.filter((s): s is string => typeof s === "string")
      : []
  };

  return result;
}
