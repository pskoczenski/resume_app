import type { JDAnalysisResult } from "@/lib/openai";

/** Structured resume data used for scoring (from parsed_json or stub). */
export interface ParsedResume {
  summary?: string;
  skills: string[];
  experience?: { company: string; role: string; bullets: string[] }[];
  rawTextForMatching: string;
}

export interface AlignmentResult {
  score: number;
  strengths: string[];
  gaps: string[];
  underemphasized_skills: string[];
}

const WEIGHTS = {
  requiredSkillOverlap: 0.3,
  relevantExperience: 0.25,
  seniorityAlignment: 0.15,
  domainAlignment: 0.1,
  keywordCoverage: 0.1,
  communicationClarity: 0.1
} as const;

function normalizeForMatch(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(s: string): Set<string> {
  const normalized = normalizeForMatch(s);
  const words = normalized.split(/\W+/).filter((w) => w.length > 1);
  return new Set(words);
}

function overlapRatio(needles: string[], haystackSet: Set<string>): number {
  if (needles.length === 0) return 1;
  const matchCount = needles.filter((n) =>
    haystackSet.has(normalizeForMatch(n))
  ).length;
  return matchCount / needles.length;
}

function phraseOverlap(phrases: string[], fullText: string): number {
  if (phrases.length === 0) return 1;
  const text = normalizeForMatch(fullText);
  const matchCount = phrases.filter((p) =>
    text.includes(normalizeForMatch(p))
  ).length;
  return matchCount / phrases.length;
}

/** Infer seniority from JD string (e.g. "Senior", "Mid-level", "Junior"). */
function parseSeniorityLevel(level: string): "senior" | "mid" | "junior" | "unknown" {
  const l = level.toLowerCase();
  if (l.includes("senior") || l.includes("sr.") || l.includes("lead")) return "senior";
  if (l.includes("mid") || l.includes("intermediate") || l.includes("mid-level")) return "mid";
  if (l.includes("junior") || l.includes("jr.") || l.includes("entry")) return "junior";
  return "unknown";
}

/** Infer resume seniority from titles and text (simple heuristic). */
function inferResumeSeniority(resume: ParsedResume): "senior" | "mid" | "junior" | "unknown" {
  const text = resume.rawTextForMatching.toLowerCase();
  if (/\b(senior|sr\.|lead|principal|staff|director|head of)\b/.test(text)) return "senior";
  if (/\b(junior|jr\.|entry|associate)\b/.test(text)) return "junior";
  if (resume.experience && resume.experience.length >= 2) return "mid";
  return "unknown";
}

function seniorityScore(jdLevel: string, resume: ParsedResume): number {
  const jd = parseSeniorityLevel(jdLevel);
  const res = inferResumeSeniority(resume);
  if (jd === "unknown" || res === "unknown") return 0.5;
  const order: ("junior" | "mid" | "senior")[] = ["junior", "mid", "senior"];
  const jdIdx = order.indexOf(jd as "junior" | "mid" | "senior");
  const resIdx = order.indexOf(res as "junior" | "mid" | "senior");
  if (jdIdx === resIdx) return 1;
  if (Math.abs(jdIdx - resIdx) === 1) return 0.7;
  return 0.3;
}

/** Simple clarity heuristic: has bullets and some length. */
function clarityScore(resume: ParsedResume): number {
  const text = resume.rawTextForMatching;
  const hasBullets = /[•\-\*]\s|\d+\.\s/m.test(text);
  const bulletCount = (text.match(/[•\-\*]\s|\d+\.\s/g) || []).length;
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 50) return 0.3;
  if (hasBullets && bulletCount >= 3 && wordCount >= 100) return 1;
  if (hasBullets && bulletCount >= 1) return 0.7;
  return 0.5;
}

/**
 * Compute alignment score and strengths/gaps/underemphasized skills.
 * Deterministic and testable.
 */
export function computeAlignmentScore(args: {
  resume: ParsedResume;
  jd: JDAnalysisResult;
}): AlignmentResult {
  const { resume, jd } = args;
  const resumeWordSet = tokenize(resume.rawTextForMatching);
  const allJdWords = [
    ...jd.required_skills,
    ...jd.preferred_skills,
    ...jd.domain_keywords
  ];
  const jdWordSet = new Set(allJdWords.map(normalizeForMatch));

  const requiredSkillScore = overlapRatio(
    jd.required_skills,
    resumeWordSet
  );
  const preferredSkillScore = overlapRatio(
    jd.preferred_skills,
    resumeWordSet
  );
  const experienceScore = phraseOverlap(
    jd.responsibilities,
    resume.rawTextForMatching
  );
  const seniorityScoreVal = seniorityScore(jd.seniority_level, resume);
  const domainScore = overlapRatio(jd.domain_keywords, resumeWordSet);
  const keywordScore =
    jd.required_skills.length + jd.preferred_skills.length > 0
      ? overlapRatio(
          [...jd.required_skills, ...jd.preferred_skills],
          resumeWordSet
        )
      : 0.5;
  const clarityScoreVal = clarityScore(resume);

  const score =
    WEIGHTS.requiredSkillOverlap * requiredSkillScore +
    WEIGHTS.relevantExperience * experienceScore +
    WEIGHTS.seniorityAlignment * seniorityScoreVal +
    WEIGHTS.domainAlignment * domainScore +
    WEIGHTS.keywordCoverage * keywordScore +
    WEIGHTS.communicationClarity * clarityScoreVal;

  const normalizedScore = Math.round(Math.min(100, Math.max(0, score * 100)));

  const strengths: string[] = [];
  if (requiredSkillScore >= 0.5)
    strengths.push(
      `Strong overlap with required skills (${(requiredSkillScore * 100).toFixed(0)}% match).`
    );
  if (experienceScore >= 0.5)
    strengths.push(
      `Experience aligns with key responsibilities (${(experienceScore * 100).toFixed(0)}% match).`
    );
  if (seniorityScoreVal >= 0.7)
    strengths.push("Seniority level aligns with the role.");
  if (domainScore >= 0.5)
    strengths.push("Domain keywords present in resume.");
  if (strengths.length === 0) strengths.push("Resume has relevant content to build on.");

  const gaps: string[] = [];
  const missingRequired = jd.required_skills.filter(
    (s) => !resumeWordSet.has(normalizeForMatch(s))
  );
  if (missingRequired.length > 0)
    gaps.push(`Missing required skills: ${missingRequired.slice(0, 5).join(", ")}.`);
  if (experienceScore < 0.4)
    gaps.push("Limited overlap with stated job responsibilities.");
  if (domainScore < 0.3 && jd.domain_keywords.length > 0)
    gaps.push("Few domain keywords found in resume.");

  const underemphasized_skills: string[] = [];
  const presentButWeak = jd.preferred_skills.filter((s) => {
    const n = normalizeForMatch(s);
    return resumeWordSet.has(n) || resume.rawTextForMatching.toLowerCase().includes(n);
  });
  if (presentButWeak.length > 0)
    underemphasized_skills.push(
      `Could highlight more: ${presentButWeak.slice(0, 3).join(", ")}.`
    );

  return {
    score: normalizedScore,
    strengths,
    gaps,
    underemphasized_skills
  };
}

/**
 * Build ParsedResume from raw_text when parsed_json is null (stub for Step 4).
 * Uses simple heuristics so scoring still works before AI resume parsing exists.
 */
export function stubParsedResumeFromRawText(rawText: string): ParsedResume {
  const lines = rawText.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const skills: string[] = [];
  const bullets: string[] = [];
  for (const line of lines) {
    if (/^[•\-\*]\s|\d+\.\s/.test(line) || line.length > 40) {
      bullets.push(line);
    } else if (line.length <= 40 && line.length > 2 && !/^\d+$/.test(line)) {
      skills.push(line);
    }
  }
  return {
    summary: lines[0] ?? "",
    skills: skills.slice(0, 30),
    experience: bullets.length > 0 ? [{ company: "", role: "", bullets }] : [],
    rawTextForMatching: rawText
  };
}

/** Parse stored parsed_json (or stub from rawText) into ParsedResume. */
export function toParsedResume(
  rawText: string,
  parsedJson: unknown
): ParsedResume {
  if (parsedJson && typeof parsedJson === "object" && "skills" in parsedJson) {
    const p = parsedJson as Record<string, unknown>;
    const skills = Array.isArray(p.skills)
      ? (p.skills as unknown[]).map(String)
      : [];
    const experience = Array.isArray(p.experience)
      ? (p.experience as Record<string, unknown>[]).map((e) => ({
          company: String(e.company ?? ""),
          role: String(e.role ?? ""),
          bullets: Array.isArray(e.bullets) ? (e.bullets as unknown[]).map(String) : []
        }))
      : [];
    const summary = typeof p.summary === "string" ? p.summary : "";
    return {
      summary,
      skills,
      experience,
      rawTextForMatching: rawText
    };
  }
  return stubParsedResumeFromRawText(rawText);
}
