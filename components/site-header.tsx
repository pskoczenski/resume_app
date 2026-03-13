import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload Resume" },
  { href: "/analysis", label: "Job Analysis" },
  { href: "/tailor", label: "Tailor" }
];

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-lg font-semibold tracking-tight">
            RoleTune
          </span>
        </Link>
        <nav className="flex items-center space-x-2 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Button variant="outline" size="sm" asChild>
            <Link href="/upload">Start Tailoring</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

