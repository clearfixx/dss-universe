"use client";

import { DesignScope } from "@/components/ui/design-scope";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

export default function NewsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DesignScope className="mx-auto my-24 max-w-xl">
    <Alert variant="destructive" className="p-8 text-center">
      <h2 className="text-xl font-semibold">Новинний канал втратив сигнал</h2>
      <p className="my-4 text-muted-foreground">Спробуйте відновити з’єднання.</p>
      <Button onClick={reset}>Повторити</Button>
    </Alert>
    </DesignScope>
  );
}
