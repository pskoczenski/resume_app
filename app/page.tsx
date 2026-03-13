import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Badge>Alpha</Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          Tailor your resume to every role.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          RoleTune analyzes your existing resume against a specific job
          description, surfaces alignment and gaps, and suggests stronger
          phrasing—without ever inventing experience.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href="/upload" className="inline-flex items-center gap-2">
              Upload resume
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/analysis">Paste job description</a>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Analyze alignment</CardTitle>
            <CardDescription>
              Understand how well your resume matches a specific role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload your resume and paste a job description to see strengths,
              gaps, and an overall match score.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strengthen your story</CardTitle>
            <CardDescription>
              Rewrite bullets and summaries without fabricating experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get suggested rewrites that highlight impact, technologies, and
              responsibilities already present in your experience.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export tailored content</CardTitle>
            <CardDescription>
              Bring your updated summary, bullets, and keywords anywhere.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Copy tailored content into your main resume, portfolio, or
              application tracking system in just a few clicks.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

