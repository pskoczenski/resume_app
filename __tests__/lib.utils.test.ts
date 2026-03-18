import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional values", () => {
    const active = true;
    expect(cn("base", active && "active")).toBe("base active");
  });
});

