import { NextRequest } from "next/server";

import { POST } from "@/app/api/resumes/upload/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    resume: {
      create: jest.fn().mockResolvedValue({
        id: "test-id",
        filename: "resume.pdf",
        fileUrl: "https://example.com/resume.pdf",
        rawText: "Example resume text"
      })
    }
  }
}));

jest.mock("@/lib/supabase-server", () => ({
  SUPABASE_BUCKET: "resumes",
  supabaseServerClient: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "resume.pdf" },
          error: null
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/resume.pdf" }
        })
      })
    }
  }
}));

// Mock pdf-parse and mammoth to avoid binary parsing in tests
jest.mock("pdf-parse", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ text: "PDF text" })
}));

jest.mock("mammoth", () => ({
  __esModule: true,
  default: {
    extractRawText: jest
      .fn()
      .mockResolvedValue({ value: "DOCX text" })
  }
}));

function createFormDataRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return new NextRequest("http://localhost/api/resumes/upload", {
    method: "POST",
    body: formData as any
  });
}

describe("POST /api/resumes/upload", () => {
  it("rejects when file is missing", async () => {
    const req = new NextRequest("http://localhost/api/resumes/upload", {
      method: "POST"
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects unsupported file types", async () => {
    const file = new File(["test"], "resume.txt", {
      type: "text/plain"
    });
    const req = createFormDataRequest(file);

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

