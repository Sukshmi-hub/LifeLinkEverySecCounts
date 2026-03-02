import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        {Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        {description}
      </p>

      {action && (
        <Button onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
