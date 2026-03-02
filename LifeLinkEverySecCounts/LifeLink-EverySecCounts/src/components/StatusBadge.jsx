import React from "react";
import { cn } from "@/lib/utils";

function StatusBadge({
  children,
  variant = "default",
  pulse = false,
  className,
}) {
  const variantStyles = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning-foreground",
    critical: "bg-critical-light text-critical",
    muted: "bg-muted/50 text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantStyles[variant] || variantStyles.default,
        pulse && "animate-pulse-subtle",
        className
      )}
    >
      {(variant === "critical" || variant === "warning") && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "critical" ? "bg-critical" : "bg-warning",
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </span>
  );
}

export default StatusBadge;
