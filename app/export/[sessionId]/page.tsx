"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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

type ExportPayload = {
  tailored_summary: string;
  tailored_bullets: string[];
  keywords: string[];
};

export default function ExportPage({
  params
}: {
  params: { sessionId: string };
}) {
  const sessionId = params.sessionId;
  const [data, setData] = useState<ExportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<
    "summary" | "bullets" | "keywords" | null
  >(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      });
      const json = (await res.json()) as ExportPayload | { error?: string };
      if (!res.ok) {
        throw new Error(
          (json as { error?: string }).error ?? "Failed to load export."
        );
      }
      setData(json as ExportPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function copyToClipboard(
    text: string,
    which: "summary" | "bullets" | "keywords"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(which);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Export</h1>
        <p className="text-muted-foreground">Loading export data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Export</h1>
        <Alert variant="destructive">{error}</Alert>
        <Button variant="outline" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const bulletsText = data.tailored_bullets.join("\n");
  const keywordsText = data.keywords.join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Export tailored content
          </h1>
          <p className="mt-1 text-muted-foreground">
            Copy summary, bullets, and keywords. Content is derived from your
            original resume and accepted suggestions only.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/tailor/${sessionId}`}>Back to workspace</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tailored summary</CardTitle>
          <CardDescription>
            Summary with accepted summary rewrites applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            readOnly
            className="min-h-[120px] font-mono text-sm"
            value={data.tailored_summary}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              copyToClipboard(data.tailored_summary, "summary")
            }
          >
            {copyFeedback === "summary" ? "Copied" : "Copy summary"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Updated bullets</CardTitle>
          <CardDescription>
            Experience bullets with accepted bullet rewrites applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="list-inside list-disc space-y-1 text-sm">
            {data.tailored_bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copyToClipboard(bulletsText, "bullets")}
          >
            {copyFeedback === "bullets" ? "Copied" : "Copy bullets"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword suggestions</CardTitle>
          <CardDescription>
            JD-derived and accepted keyword/skills suggestions, deduplicated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {data.keywords.map((k) => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copyToClipboard(keywordsText, "keywords")}
          >
            {copyFeedback === "keywords" ? "Copied" : "Copy keywords"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <Button disabled variant="outline" title="Coming soon">
          Export DOCX (coming soon)
        </Button>
      </div>
    </div>
  );
}
