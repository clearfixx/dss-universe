import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-card border p-4 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-foreground",
      info: "border-brand-cyan/30 bg-brand-cyan/5 text-foreground",
      success: "border-success/30 bg-success/5 text-foreground",
      warning: "border-warning/30 bg-warning/5 text-foreground",
      destructive: "border-destructive/30 bg-destructive/5 text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

/** Choose role="alert" for urgent dynamic messages; static notices need no live role. */
function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-title" className={cn("font-medium", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("mt-1 text-muted-foreground", className)} {...props} />;
}

function EmptyState({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-state" className={cn("flex flex-col items-center gap-3 rounded-card border border-dashed border-border p-6 text-center", className)} {...props} />;
}

function EmptyStateTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="empty-state-title" className={cn("font-heading text-base font-medium text-foreground", className)} {...props} />;
}

function EmptyStateDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="empty-state-description" className={cn("max-w-md text-sm text-muted-foreground", className)} {...props} />;
}

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} {...props} />;
}

/** One accessible announcement per loading region, not per skeleton. */
function LoadingState({ className, ...props }: React.ComponentProps<"div"> & { "aria-label": string }) {
  return <div data-slot="loading-state" role="status" aria-busy="true" className={cn("space-y-3", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, EmptyState, EmptyStateTitle, EmptyStateDescription, Skeleton, LoadingState };
