"use client";
import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
import { cn } from "@/lib/utils";

interface ResumeOption {
  id: string;
  filename: string;
  createdAt: string;
}

interface JDOption {
  id: string;
  title: string;
  company: string;
  createdAt: string;
}

interface RunResult {
  session_id: string;
  score: number;
  strengths: string[];
  gaps: string[];
  underemphasized_skills: string[];
}

export default function TailorPage() {
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [jds, setJds] = useState<JDOption[]>([]);
  const [resumeId, setResumeId] = useState<string>("");
  const [jdId, setJdId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/resumes/list").then((r) => r.json()),
      fetch("/api/jd/list").then((r) => r.json())
    ]).then(([resumesData, jdsData]) => {
      if (Array.isArray(resumesData)) setResumes(resumesData);
      if (Array.isArray(jdsData)) setJds(jdsData);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!resumeId || !jdId) {
      setError("Please select both a resume and a job description.");
      return;
    }
    try {
      setIsRunning(true);
      const res = await fetch("/api/tailor/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id: resumeId, jd_id: jdId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to run analysis.");
      setResult(data as RunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Run alignment analysis
        </h1>
        <p className="mt-2 text-muted-foreground">
          Compare a resume to a job description and see match score, strengths,
          and gaps.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Select resume & job description</CardTitle>
            <CardDescription>
              Choose one resume and one job description to run the alignment
              analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Resume
                </label>
                <select
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  disabled={resumes.length === 0}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <option value="">
                    {resumes.length === 0
                      ? "No resumes yet — upload one first"
                      : "Select a resume"}
                  </option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Job description
                </label>
                <select
                  value={jdId}
                  onChange={(e) => setJdId(e.target.value)}
                  disabled={jds.length === 0}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <option value="">
                    {jds.length === 0
                      ? "No job descriptions yet — analyze one first"
                      : "Select a job description"}
                  </option>
                  {jds.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title || "Untitled"} at {j.company || "Unknown"}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={isRunning || !resumeId || !jdId}>
                {isRunning ? "Running…" : "Run alignment analysis"}
              </Button>
              {error && (
                <Alert variant="destructive" className="text-sm">
                  {error}
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Match score, strengths, gaps, and underemphasized skills.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Score</span>
                  <Badge variant="secondary" className="text-lg">
                    {result.score}%
                  </Badge>
                </div>
                {result.strengths.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Strengths
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-sm">
                      {result.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.gaps.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Gaps
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-sm">
                      {result.gaps.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.underemphasized_skills.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Underemphasized
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-sm">
                      {result.underemphasized_skills.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Session ID: {result.session_id}
                </p>
                <Button asChild className="mt-2">
                  <Link href={`/tailor/${result.session_id}`}>
                    Open tailoring workspace
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run an analysis to see results here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
