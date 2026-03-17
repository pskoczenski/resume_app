"use client";
import React from "react";

import { useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { JDAnalysisResult } from "@/lib/openai";

interface AnalyzeResponse {
  job_description_id: string;
  requirements: JDAnalysisResult;
}

export default function AnalysisPage() {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!rawText.trim()) {
      setError("Please paste a job description.");
      return;
    }

    try {
      setIsAnalyzing(true);
      const res = await fetch("/api/jd/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          company: company.trim(),
          raw_text: rawText.trim()
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          (data as { error?: string })?.error || "Failed to analyze job description."
        );
      }

      setResult(data as AnalyzeResponse);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error during analysis."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  const req = result?.requirements;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Analyze job description
        </h1>
        <p className="mt-2 text-muted-foreground">
          Paste a job description to extract required skills, responsibilities,
          seniority, and domain keywords for tailoring.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-0">
            <CardHeader>
              <CardTitle>Job details</CardTitle>
              <CardDescription>
                Role title and company are optional but help when saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="mb-1 block text-sm font-medium"
                >
                  Role title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                />
              </div>
              <div>
                <label
                  htmlFor="company"
                  className="mb-1 block text-sm font-medium"
                >
                  Company
                </label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Inc."
                />
              </div>
              <div>
                <label
                  htmlFor="raw_text"
                  className="mb-1 block text-sm font-medium"
                >
                  Job description
                </label>
                <Textarea
                  id="raw_text"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="min-h-[200px]"
                  required
                />
              </div>
              <Button type="submit" disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing…" : "Analyze job description"}
              </Button>
              {error && (
                <Alert variant="destructive" className="text-sm">
                  {error}
                </Alert>
              )}
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extracted requirements</CardTitle>
            <CardDescription>
              Required skills, preferred skills, responsibilities, seniority,
              and domain keywords.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {req ? (
              <div className="space-y-4">
                {req.seniority_level && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Seniority
                    </p>
                    <Badge variant="secondary">{req.seniority_level}</Badge>
                  </div>
                )}
                {req.required_skills?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Required skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {req.required_skills.map((s) => (
                        <Badge key={s} variant="default">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {req.preferred_skills?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Preferred skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {req.preferred_skills.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {req.responsibilities?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Responsibilities
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-sm">
                      {req.responsibilities.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {req.domain_keywords?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      Domain keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {req.domain_keywords.map((k) => (
                        <Badge key={k} variant="outline">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Saved as job description ID: {result?.job_description_id}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Submit a job description to see extracted requirements here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
