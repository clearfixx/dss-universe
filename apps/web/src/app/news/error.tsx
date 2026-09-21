"use client";

import { Button } from "@/components/ui/button";

export default function NewsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto my-24 max-w-xl rounded-2xl border border-rose-400/20 bg-rose-400/5 p-8 text-center">
      <h2 className="text-xl font-semibold">Новинний канал втратив сигнал</h2>
      <p className="my-4 text-slate-400">Спробуйте відновити з’єднання.</p>
      <Button onClick={reset}>Повторити</Button>
    </div>
  );
}
