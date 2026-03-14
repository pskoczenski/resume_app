import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the main headline and primary actions", () => {
    render(<HomePage />);

    expect(
      screen.getByText("Tailor your resume to every role.")
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /upload resume/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /paste job description/i })
    ).toBeInTheDocument();
  });
});

