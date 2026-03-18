"use client";
import React from "react";
import type { JDAnalysisResult } from "@/lib/openai";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type WorkspacePayload = {
  session: {
    id: string;
    resume_id: string;
    job_description_id: string;
    score: number;
    analysis: unknown;
    created_at: string;
  };
  resume: {
    id: string;
    filename: string;
    file_url: string;
    raw_text: string;
    parsed_json: unknown;
    created_at: string;
  };
  job_description: {
    id: string;
    title: string;
    company: string;
    raw_text: string;
    requirements_json: unknown;
    created_at: string;
  };
  suggestions: Array<{
    id: string;
    session_id: string;
    type: string;
    original_text: string;
    suggested_text: string;
    rationale: string;
    jd_mapping: unknown;
    accepted: boolean;
    created_at: string;
  }>;
};

type Suggestion = WorkspacePayload["suggestions"][number];

function groupLabel(type: string): string {
  switch (type) {
    case "summary_rewrite":
      return "Summary";
    case "bullet_rewrite":
      return "Bullets";
    case "keyword_addition":
      return "Keywords";
    case "skills_adjustment":
      return "Skills";
    case "section_feedback":
      return "Feedback";
    default:
      return "Other";
  }
}

export default function TailorWorkspacePage({
  params
}: {
  params: { sessionId: string };
}) {
  const sessionId = params.sessionId;

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});

  const suggestions = data?.suggestions ?? [];
  const suggestionsByType = useMemo(() => {
    const groups = new Map<string, Suggestion[]>();
    for (const s of suggestions) {
      const arr = groups.get(s.type) ?? [];
      arr.push(s);
      groups.set(s.type, arr);
    }
    return groups;
  }, [suggestions]);

  async function load() {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tailor/session/${sessionId}`);
      const payload = (await res.json()) as any;
      if (!res.ok) throw new Error(payload?.error ?? "Failed to load session.");

      setData(payload as WorkspacePayload);
      const nextEdits: Record<string, string> = {};
      for (const s of (payload.suggestions ?? []) as Suggestion[]) {
        nextEdits[s.id] = s.suggested_text;
      }
      setEdited(nextEdits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function generateSuggestions() {
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/tailor/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      });
      const payload = (await res.json()) as any;
      if (!res.ok)
        throw new Error(payload?.error ?? "Failed to generate suggestions.");

      // Refresh the full workspace payload to show updated suggestions list.
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateSuggestion(id: string, accepted: boolean) {
    setError(null);
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted,
          suggested_text: edited[id] ?? ""
        })
      });
      const payload = (await res.json()) as any;
      if (!res.ok) throw new Error(payload?.error ?? "Failed to update suggestion.");

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          suggestions: prev.suggestions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  accepted: payload.accepted,
                  suggested_text: payload.suggested_text
                }
              : s
          )
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  const score = data?.session.score ?? null;
  const analysis = (data?.session.analysis ?? {}) as any;
  const strengths: string[] = Array.isArray(analysis?.strengths) ? analysis.strengths : [];
  const gaps: string[] = Array.isArray(analysis?.gaps) ? analysis.gaps : [];
  const acceptedSuggestions = (data?.suggestions ?? []).filter((s) => s.accepted);
  const keywordSkillGaps = useMemo(() => {
    const req = (data?.job_description?.requirements_json ?? {}) as JDAnalysisResult;
    const jdSource = [
      ...(Array.isArray(req.required_skills) ? req.required_skills : []),
      ...(Array.isArray(req.preferred_skills) ? req.preferred_skills : []),
      ...(Array.isArray(req.domain_keywords) ? req.domain_keywords : [])
    ]
      .map((s) => String(s).trim())
      .filter(Boolean);

    const suggested = acceptedSuggestions
      .filter(
        (s) => s.type === "keyword_addition" || s.type === "skills_adjustment"
      )
      .flatMap((s) =>
        String(s.suggested_text)
          .split(/[\n,]+/)
          .map((t) => t.trim())
          .filter(Boolean)
      );

    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of [...jdSource, ...suggested]) {
      const key = k.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(k);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [acceptedSuggestions, data?.job_description?.requirements_json]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Tailoring workspace
            </h1>
            {data?.job_description ? (
              <p className="mt-1 text-muted-foreground">
                For{" "}
                <span className="font-medium">{data.job_description.title}</span>{" "}
                at <span className="font-medium">{data.job_description.company}</span>
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">
                Session <Badge variant="outline">{sessionId}</Badge>
              </p>
            )}
          </div>
          {score !== null && (
            <Badge variant="secondary" className="text-base">
              {score}% match
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generateSuggestions} disabled={isGenerating}>
            {isGenerating ? "Generating…" : "Generate suggestions"}
          </Button>
          <Button variant="outline" onClick={load} disabled={isLoading}>
            {isLoading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/export/${sessionId}`}>Export</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/tailor/debug/${sessionId}`}>Open debug view</a>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="text-sm">
            {error}
          </Alert>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Original resume</CardTitle>
            <CardDescription>
              Source text stored from your upload. (Structured rendering comes later.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.resume ? (
              <Textarea
                readOnly
                value={data.resume.raw_text}
                className="h-[520px] resize-none font-mono text-xs"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading resume…" : "No resume loaded."}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session summary</CardTitle>
              <CardDescription>
                Strengths and gaps from the alignment analysis, plus deduplicated keyword/skill gaps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Strengths
                </p>
                {strengths.length ? (
                  <ul className="list-inside list-disc space-y-0.5 text-sm">
                    {strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Gaps
                </p>
                {gaps.length ? (
                  <ul className="list-inside list-disc space-y-0.5 text-sm">
                    {gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Keyword / skills gaps
                </p>
                {keywordSkillGaps.length ? (
                  <div className="flex flex-wrap gap-2">
                    {keywordSkillGaps.map((k) => (
                      <Badge key={k} variant="secondary">
                        {k}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggestions</CardTitle>
              <CardDescription>
                Edit the suggestion text, then accept or reject it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {suggestions.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No suggestions yet. Generate suggestions to populate this list.
                  </p>
                </div>
              ) : (
                Array.from(suggestionsByType.entries()).map(([type, items]) => (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{groupLabel(type)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {items.length} item{items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className={[
                          "rounded-lg border p-4",
                          s.accepted
                            ? "border-green-300 bg-green-50"
                            : "border-border bg-background"
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant={s.accepted ? "default" : "secondary"}>
                            {s.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {s.accepted ? "Accepted" : "Pending"}
                          </span>
                        </div>

                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                              Original
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {s.original_text}
                            </p>
                          </div>

                          <div>
                            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                              Suggested (editable)
                            </p>
                            <Textarea
                              value={edited[s.id] ?? s.suggested_text}
                              onChange={(e) =>
                                setEdited((prev) => ({
                                  ...prev,
                                  [s.id]: e.target.value
                                }))
                              }
                              className="min-h-[96px]"
                            />
                          </div>

                          <details className="text-sm">
                            <summary className="cursor-pointer text-muted-foreground">
                              Why this helps
                            </summary>
                            <p className="mt-2 text-muted-foreground">{s.rationale}</p>
                          </details>

                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => updateSuggestion(s.id, true)}>
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => updateSuggestion(s.id, false)}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

