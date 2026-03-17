import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import TailorWorkspacePage from "@/app/tailor/[sessionId]/page";

jest.mock("@radix-ui/react-slot", () => ({
  Slot: ({ children }: { children?: React.ReactNode }) => children ?? null
}));

jest.mock("class-variance-authority", () => ({
  cva: () => () => "",
  VariantProps: {}
}));

describe("TailorWorkspacePage", () => {
  beforeEach(() => {
    const fetchMock = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/tailor/session/session-1")) {
        return new Response(
          JSON.stringify({
            session: {
              id: "session-1",
              resume_id: "r1",
              job_description_id: "j1",
              score: 82,
              analysis: { strengths: ["React"], gaps: ["A/B testing"] },
              created_at: new Date().toISOString()
            },
            resume: {
              id: "r1",
              filename: "resume.pdf",
              file_url: "https://example.com/resume.pdf",
              raw_text: "Original resume text",
              parsed_json: null,
              created_at: new Date().toISOString()
            },
            job_description: {
              id: "j1",
              title: "Frontend Engineer",
              company: "Acme",
              raw_text: "JD",
              requirements_json: {},
              created_at: new Date().toISOString()
            },
            suggestions: [
              {
                id: "sg1",
                session_id: "session-1",
                type: "bullet_rewrite",
                original_text: "Built UI",
                suggested_text: "Built UI with React",
                rationale: "Adds React keyword",
                jd_mapping: [],
                accepted: false,
                created_at: new Date().toISOString()
              }
            ]
          }),
          { status: 200 }
        );
      }

      if (url.includes("/api/suggestions/sg1") && init?.method === "PATCH") {
        return new Response(
          JSON.stringify({
            id: "sg1",
            session_id: "session-1",
            type: "bullet_rewrite",
            original_text: "Built UI",
            suggested_text: "Built UI with React",
            rationale: "Adds React keyword",
            jd_mapping: [],
            accepted: true
          }),
          { status: 200 }
        );
      }

      if (url.includes("/api/tailor/suggestions") && init?.method === "POST") {
        return new Response(JSON.stringify({ session_id: "session-1", suggestions: [] }), {
          status: 200
        });
      }

      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    });

    // @ts-expect-error - override in test
    global.fetch = fetchMock;
  });

  it("renders both columns and loads suggestions", async () => {
    render(<TailorWorkspacePage params={{ sessionId: "session-1" }} />);

    expect(screen.getByText(/tailoring workspace/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText(/original resume/i)).toBeInTheDocument()
    );

    expect(screen.getByText(/suggestions/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/built ui with react/i)).toBeInTheDocument();
  });

  it("accepts a suggestion and calls PATCH endpoint", async () => {
    render(<TailorWorkspacePage params={{ sessionId: "session-1" }} />);

    await waitFor(() =>
      expect(screen.getByDisplayValue(/built ui with react/i)).toBeInTheDocument()
    );

    const accept = screen.getAllByRole("button", { name: /accept/i })[0];
    fireEvent.click(accept);

    await waitFor(() => expect(screen.getByText(/accepted/i)).toBeInTheDocument());
    expect((global.fetch as unknown as jest.Mock).mock.calls.some((c) => String(c[0]).includes("/api/suggestions/sg1"))).toBe(true);
  });
});

