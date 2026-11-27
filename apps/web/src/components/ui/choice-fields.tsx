import * as React from "react";

import { cn } from "@/lib/utils";

/** Native form controls retain browser keyboard, validation and submission behavior. */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn("text-sm font-medium text-foreground", className)} {...props} />;
}

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn("h-8 min-w-0 rounded-lg border border-input bg-field px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-field-dark", className)}
      {...props}
    />
  );
}

type ChoiceProps = Omit<React.ComponentProps<"input">, "type">;

const choiceClass = "size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:outline-destructive";

function Checkbox({ className, ...props }: ChoiceProps) {
  return <input data-slot="checkbox" type="checkbox" className={cn(choiceClass, className)} {...props} />;
}

function Radio({ className, ...props }: ChoiceProps) {
  return <input data-slot="radio" type="radio" className={cn(choiceClass, className)} {...props} />;
}

function Switch({ className, ...props }: ChoiceProps) {
  return (
    <input
      data-slot="switch"
      type="checkbox"
      role="switch"
      className={cn("relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-muted transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-3.5 before:rounded-full before:bg-foreground before:transition-transform checked:border-primary checked:bg-primary checked:before:translate-x-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:before:transition-none forced-colors:appearance-auto", className)}
      {...props}
    />
  );
}

export { Label, NativeSelect, Checkbox, Radio, Switch };
