import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RoleTune — Resume Tailoring",
  description:
    "Tailor your resume to specific job descriptions without fabricating experience."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col bg-background">
          <SiteHeader />
          <main className="flex-1">
            <div className="container py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

