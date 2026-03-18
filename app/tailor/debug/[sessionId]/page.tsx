"use client";

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

type SuggestionDto = {
  id: string;
  session_id: string;
  type: string;
  original_text: string;
  suggested_text: string;
  rationale: string;
  jd_mapping: unknown;
  accepted: boolean;
};

export default function TailorDebugSessionPage({
  params
}: {
  params: { sessionId: string };
}) {
  const sessionId = params.sessionId;
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionDto[]>([]);
  const [editedText, setEditedText] = useState<Record<string, string>>({});

  const hasAny = suggestions.length > 0;
  const byId = useMemo(() => new Map(suggestions.map((s) => [s.id, s])), [suggestions]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      setIsLoading(true);
      try {
        // Load existing suggestions if any by triggering generation endpoint (it returns saved list).
        const res = await fetch("/api/tailor/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load suggestions.");
        if (!cancelled) {
          setSuggestions(data.suggestions ?? []);
          const initialEdits: Record<string, string> = {};
          for (const s of (data.suggestions ?? []) as SuggestionDto[]) {
            initialEdits[s.id] = s.suggested_text;
          }
          setEditedText(initialEdits);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function generate() {
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/tailor/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate suggestions.");
      setSuggestions(data.suggestions ?? []);
      const nextEdits: Record<string, string> = {};
      for (const s of (data.suggestions ?? []) as SuggestionDto[]) {
        nextEdits[s.id] = s.suggested_text;
      }
      setEditedText(nextEdits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function setAccepted(id: string, accepted: boolean) {
    setError(null);
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted,
          suggested_text: editedText[id] ?? byId.get(id)?.suggested_text ?? ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update suggestion.");
      setSuggestions((prev) => prev.map((s) => (s.id === id ? (data as SuggestionDto) : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tailor debug</h1>
        <p className="mt-2 text-muted-foreground">
          Session <Badge variant="outline">{sessionId}</Badge>
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={generate} disabled={isGenerating}>
          {isGenerating ? "Generating…" : "Generate / refresh suggestions"}
        </Button>
        {isLoading && <Badge variant="secondary">Loading…</Badge>}
        {hasAny && <Badge variant="secondary">{suggestions.length} suggestions</Badge>}
      </div>

      {error && (
        <Alert variant="destructive" className="text-sm">
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        {suggestions.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="truncate">{s.type}</span>
                <Badge variant={s.accepted ? "default" : "secondary"}>
                  {s.accepted ? "Accepted" : "Pending"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Mapped:{" "}
                <span className="font-mono text-xs">
                  {JSON.stringify(s.jd_mapping)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Original
                </p>
                <p className="text-sm">{s.original_text}</p>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Suggested (editable)
                </p>
                <Textarea
                  value={editedText[s.id] ?? s.suggested_text}
                  onChange={(e) =>
                    setEditedText((prev) => ({ ...prev, [s.id]: e.target.value }))
                  }
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  Rationale
                </p>
                <p className="text-sm text-muted-foreground">{s.rationale}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAccepted(s.id, true)}>
                  Accept
                </Button>
                <Button variant="outline" onClick={() => setAccepted(s.id, false)}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!hasAny && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>No suggestions yet</CardTitle>
              <CardDescription>
                Generate suggestions to see them here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={generate} disabled={isGenerating}>
                {isGenerating ? "Generating…" : "Generate suggestions"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

