import type { JDAnalysisResult } from "@/lib/openai";

const SKILL_ALIASES: Record<string, string[]> = {
  "javascript": ["js", "javascript", "ecmascript", "es6", "es2015"],
  "typescript": ["ts", "typescript"],
  "node.js": ["node", "nodejs", "node.js"],
  "react": ["react", "react.js", "reactjs"],
  "next.js": ["next", "nextjs", "next.js"],
  "vue": ["vue", "vue.js", "vuejs"],
  "angular": ["angular", "angularjs", "angular.js"],
  "postgresql": ["postgres", "postgresql", "psql"],
  "mysql": ["mysql", "mariadb"],
  "mongodb": ["mongo", "mongodb"],
  "aws": ["aws", "amazon web services", "ec2", "s3", "lambda"],
  "gcp": ["gcp", "google cloud", "google cloud platform"],
  "azure": ["azure", "microsoft azure"],
  "rest api": ["rest", "rest api", "restful", "restful api", "http api", "api integration"],
  "graphql": ["graphql", "apollo", "apollo graphql"],
  "ci/cd": [
    "ci/cd",
    "ci cd",
    "continuous integration",
    "continuous delivery",
    "continuous deployment",
    "github actions",
    "circleci",
    "jenkins",
    "gitlab ci"
  ],
  "docker": ["docker", "containerization", "containers", "dockerfile"],
  "kubernetes": ["kubernetes", "k8s"],
  "terraform": ["terraform", "infrastructure as code", "iac"],
  "testing": [
    "jest",
    "vitest",
    "cypress",
    "playwright",
    "mocha",
    "chai",
    "unit testing",
    "integration testing",
    "e2e",
    "end-to-end testing"
  ],
  "redis": ["redis", "elasticache"],
  "git": ["git", "github", "gitlab", "version control"],
  "python": ["python", "py"],
  "java": ["java", "jvm"],
  "go": ["go", "golang"],
  "rust": ["rust", "rustlang"]
};

function canonicalizeSkill(skill: string): string {
  const normalized = normalizeForMatch(skill);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return normalized;
}

function getSkillAliases(skill: string): string[] {
  const normalized = normalizeForMatch(skill);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (canonical === normalized || aliases.includes(normalized)) return aliases;
  }
  return [normalized];
}

/** Structured resume data used for scoring (from parsed_json or stub). */
export interface ParsedResume {
  summary?: string;
  skills: string[];
  experience?: { company: string; role: string; bullets: string[] }[];
  rawTextForMatching: string;
}

export interface SkillMatchDetail {
  skill: string;
  status: "explicit" | "adjacent" | "missing";
  score: number;
  source: ("skills" | "summary" | "experience")[];
  matched_terms: string[];
}

export interface AlignmentResult {
  score: number;
  strengths: string[];
  gaps: string[];
  underemphasized_skills: string[];
  required_skill_details: SkillMatchDetail[];
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

function collectResumeEvidence(resume: ParsedResume): {
  skillsText: string;
  summaryText: string;
  experienceText: string;
} {
  const skillsText = resume.skills.join(" ").toLowerCase();
  const summaryText = (resume.summary ?? "").toLowerCase();
  const experienceText = (resume.experience ?? [])
    .flatMap((e) => e.bullets)
    .join(" ")
    .toLowerCase();
  return { skillsText, summaryText, experienceText };
}

function matchRequiredSkill(
  skill: string,
  resume: ParsedResume
): SkillMatchDetail {
  const aliases = getSkillAliases(skill);
  const { skillsText, summaryText, experienceText } = collectResumeEvidence(resume);

  const sources: ("skills" | "summary" | "experience")[] = [];
  const matched_terms: string[] = [];

  for (const alias of aliases) {
    if (experienceText.includes(alias)) {
      if (!sources.includes("experience")) sources.push("experience");
      if (!matched_terms.includes(alias)) matched_terms.push(alias);
    }
    if (skillsText.includes(alias)) {
      if (!sources.includes("skills")) sources.push("skills");
      if (!matched_terms.includes(alias)) matched_terms.push(alias);
    }
    if (summaryText.includes(alias)) {
      if (!sources.includes("summary")) sources.push("summary");
      if (!matched_terms.includes(alias)) matched_terms.push(alias);
    }
  }

  // Score by source quality: experience > skills > summary > missing
  let score = 0;
  let status: SkillMatchDetail["status"] = "missing";

  if (sources.includes("experience")) {
    score = 1.0;
    status = "explicit";
  } else if (sources.includes("skills")) {
    score = 0.7;
    status = "explicit";
  } else if (sources.includes("summary")) {
    score = 0.5;
    status = "adjacent";
  } else {
    // Check for adjacent/fuzzy evidence in experience text using tokenized aliases
    const expTokens = tokenize(experienceText);
    const hasAdjacent = aliases.some((a) => expTokens.has(a));
    if (hasAdjacent) {
      score = 0.4;
      status = "adjacent";
      matched_terms.push(...aliases.filter((a) => expTokens.has(a)));
    }
  }

  return { skill, status, score, source: sources, matched_terms };
}

function computeRequiredSkillDetails(
  jd: JDAnalysisResult,
  resume: ParsedResume
): SkillMatchDetail[] {
  return jd.required_skills.map((skill) => matchRequiredSkill(skill, resume));
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

  // Evidence-based required skill matching
  const required_skill_details = computeRequiredSkillDetails(jd, resume);
  const requiredSkillScore =
    required_skill_details.reduce((sum, d) => sum + d.score, 0) /
    Math.max(required_skill_details.length, 1);

  const explicitRequired = required_skill_details.filter((d) => d.status === "explicit");
  const adjacentRequired = required_skill_details.filter((d) => d.status === "adjacent");
  const missingRequired = required_skill_details.filter((d) => d.status === "missing");

  // Preferred skill overlap (exact, for secondary signal)
  const preferredSkillScore = overlapRatio(jd.preferred_skills, resumeWordSet);

  // Responsibility phrase overlap (downweighted — phrasing variance is high)
  const experienceScore = phraseOverlap(jd.responsibilities, resume.rawTextForMatching);

  // Seniority and domain
  const seniorityScoreVal = seniorityScore(jd.seniority_level, resume);
  const domainScore = overlapRatio(jd.domain_keywords, resumeWordSet);
  const clarityScoreVal = clarityScore(resume);

  // Visibility score: are explicit required skills prominent (in experience, not just skills list)?
  const visibilityScore =
    explicitRequired.length === 0
      ? 0
      : explicitRequired.filter((d) => d.source.includes("experience")).length /
        explicitRequired.length;

  // Updated weights — required skill evidence is the focal point
  const score =
    0.40 * requiredSkillScore +
    0.20 * experienceScore +
    0.10 * seniorityScoreVal +
    0.05 * domainScore +
    0.10 * preferredSkillScore +
    0.05 * clarityScoreVal +
    0.10 * visibilityScore;

  const normalizedScore = Math.round(Math.min(100, Math.max(0, score * 100)));

  // Strengths
  const strengths: string[] = [];
  if (explicitRequired.length > 0)
    strengths.push(
      `${explicitRequired.length} of ${required_skill_details.length} required skills found (${(requiredSkillScore * 100).toFixed(0)}% match).`
    );
  if (experienceScore >= 0.5)
    strengths.push(
      `Experience aligns with key responsibilities (${(experienceScore * 100).toFixed(0)}% phrase match).`
    );
  if (seniorityScoreVal >= 0.7)
    strengths.push("Seniority level aligns with the role.");
  if (domainScore >= 0.5)
    strengths.push("Domain keywords present in resume.");
  if (strengths.length === 0)
    strengths.push("Resume has relevant content to build on.");

  // Gaps
  const gaps: string[] = [];
  if (missingRequired.length > 0)
    gaps.push(
      `Missing required skills: ${missingRequired.map((d) => d.skill).slice(0, 5).join(", ")}.`
    );
  if (adjacentRequired.length > 0)
    gaps.push(
      `Implied but not explicitly stated: ${adjacentRequired.map((d) => d.skill).slice(0, 3).join(", ")}.`
    );
  if (experienceScore < 0.4)
    gaps.push("Limited overlap with stated job responsibilities.");
  if (domainScore < 0.3 && jd.domain_keywords.length > 0)
    gaps.push("Few domain keywords found in resume.");

  // Underemphasized: explicit in skills list only, not in experience bullets
  const underemphasized_skills: string[] = [];
  const buriedSkills = explicitRequired.filter(
    (d) => d.source.includes("skills") && !d.source.includes("experience")
  );
  if (buriedSkills.length > 0)
    underemphasized_skills.push(
      `Present but not demonstrated in bullets: ${buriedSkills.map((d) => d.skill).slice(0, 3).join(", ")}.`
    );

  // Also surface preferred skills that appear in resume but aren't prominent
  const presentPreferred = jd.preferred_skills.filter((s) => {
    const aliases = getSkillAliases(s);
    return aliases.some((a) => resume.rawTextForMatching.toLowerCase().includes(a));
  });
  if (presentPreferred.length > 0)
    underemphasized_skills.push(
      `Preferred skills to highlight: ${presentPreferred.slice(0, 3).join(", ")}.`
    );

  return {
    score: normalizedScore,
    strengths,
    gaps,
    underemphasized_skills,
    required_skill_details,
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
