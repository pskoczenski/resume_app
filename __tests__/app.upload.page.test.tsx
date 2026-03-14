import { render, screen } from "@testing-library/react";

import UploadPage from "@/app/upload/page";

describe("UploadPage", () => {
  it("shows file input and upload button", () => {
    render(<UploadPage />);

    expect(
      screen.getByRole("heading", { name: /upload resume/i })
    ).toBeInTheDocument();

    // File input
    const fileInput = screen.getByLabelText(/file/i, { selector: "input" });
    expect(fileInput).toBeInTheDocument();

    // Upload button
    expect(
      screen.getByRole("button", { name: /upload & extract text/i })
    ).toBeInTheDocument();
  });
});

