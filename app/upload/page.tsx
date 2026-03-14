"use client";

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

interface UploadResponse {
  resume_id: string;
  raw_text: string;
  file_url: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<UploadResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose a PDF or DOCX resume to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "Failed to upload resume.");
      }

      const data = (await res.json()) as UploadResponse;
      setPreview(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error during upload.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload resume</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a PDF or DOCX resume. We&apos;ll extract the text and store it
          for tailoring against job descriptions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <Card asChild>
          <form onSubmit={handleSubmit} className="space-y-0">
            <CardHeader>
              <CardTitle>Resume file</CardTitle>
              <CardDescription>
                Supported formats: <Badge>PDF</Badge> <Badge>DOCX</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setFile(nextFile);
                  setPreview(null);
                  setError(null);
                }}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
              <Button type="submit" disabled={isUploading}>
                {isUploading ? "Uploading…" : "Upload & extract text"}
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
            <CardTitle>Extracted text preview</CardTitle>
            <CardDescription>
              We normalize whitespace and line breaks, but do not change the
              meaning of your content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium">Resume ID:</span>{" "}
                    {preview.resume_id}
                  </span>
                  <span className="hidden md:inline">•</span>
                  <span className="truncate">
                    <span className="font-medium">Stored file:</span>{" "}
                    {preview.file_url}
                  </span>
                </div>
                <Textarea
                  readOnly
                  value={preview.raw_text}
                  className="h-[360px] resize-none font-mono text-xs"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                After uploading a resume, the extracted text will appear here so
                you can confirm it looks correct before tailoring.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

