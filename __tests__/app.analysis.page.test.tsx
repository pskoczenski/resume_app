import { render, screen } from "@testing-library/react";

import AnalysisPage from "@/app/analysis/page";

describe("AnalysisPage", () => {
  it("renders role title, company, job description inputs and analyze button", () => {
    render(<AnalysisPage />);

    expect(
      screen.getByRole("heading", { name: /analyze job description/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/role title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /analyze job description/i })
    ).toBeInTheDocument();
  });
});
