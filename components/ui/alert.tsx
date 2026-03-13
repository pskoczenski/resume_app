import * as React from "react";

import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants: Record<NonNullable<AlertProps["variant"]>, string> = {
      default: "bg-muted text-foreground",
      destructive:
        "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-lg border p-4 text-sm",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = "Alert";

export { Alert };

