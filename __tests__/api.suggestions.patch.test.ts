/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { PATCH } from "@/app/api/suggestions/[id]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    suggestion: {
      update: jest.fn().mockResolvedValue({
        id: "sg1",
        sessionId: "s1",
        type: "bullet_rewrite",
        originalText: "Orig",
        suggestedText: "Edited",
        rationale: "Why",
        jdMapping: [],
        accepted: true
      })
    }
  }
}));

describe("PATCH /api/suggestions/:id", () => {
  it("returns 400 when no fields provided", async () => {
    const req = new NextRequest("http://localhost/api/suggestions/sg1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await PATCH(req, { params: { id: "sg1" } });
    expect(res.status).toBe(400);
  });

  it("updates accepted and suggested_text", async () => {
    const req = new NextRequest("http://localhost/api/suggestions/sg1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accepted: true, suggested_text: "Edited" })
    });
    const res = await PATCH(req, { params: { id: "sg1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("sg1");
    expect(data.accepted).toBe(true);
    expect(data.suggested_text).toBe("Edited");
  });
});

