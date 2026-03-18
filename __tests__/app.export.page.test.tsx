import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ExportPage from "@/app/export/[sessionId]/page";

jest.mock("@radix-ui/react-slot", () => ({
  Slot: ({ children }: { children?: React.ReactNode }) => children ?? null
}));

jest.mock("class-variance-authority", () => ({
  cva: () => () => "",
  VariantProps: {}
}));

describe("ExportPage", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(async (input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/export/docx")) {
        // Minimal fetch Response-like object (avoid relying on global Response in Jest env)
        return {
          ok: true,
          status: 200,
          blob: async () =>
            new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])])
        } as any;
      }

      if (url.includes("/api/export")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            tailored_summary: "Tailored summary",
            tailored_bullets: ["Bullet 1"],
            keywords: ["react"]
          })
        } as any;
      }

      return { ok: false, status: 404, text: async () => "not found" } as any;
    });

    (global as any).navigator.clipboard = {
      writeText: jest.fn().mockResolvedValue(undefined)
    };

    const createObjectURL = jest.fn(() => "blob:fake");
    const revokeObjectURL = jest.fn();
    // @ts-expect-error test shim
    global.URL.createObjectURL = createObjectURL;
    // @ts-expect-error test shim
    global.URL.revokeObjectURL = revokeObjectURL;
  });

  it("renders Download DOCX and triggers download flow", async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ExportPage params={{ sessionId: "session-1" }} />);

    await waitFor(() => {
      expect(screen.getByText("Export tailored content")).toBeInTheDocument();
    });

    const btn = screen.getByRole("button", { name: "Download DOCX" });
    fireEvent.click(btn);

    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalledWith(
        "/api/export/docx",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});

