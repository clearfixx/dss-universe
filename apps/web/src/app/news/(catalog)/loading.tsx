import { DesignScope } from "@/components/ui/design-scope";
import { LoadingState, Skeleton } from "@/components/ui/feedback";

export default function NewsLoading() {
  return (
    <DesignScope className="mx-auto max-w-7xl p-4 sm:p-6">
      <LoadingState aria-label="Завантаження новин" className="space-y-6">
      <Skeleton className="h-40 rounded-card" />
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-80 rounded-card" />
        ))}
      </div>
      </LoadingState>
    </DesignScope>
  );
}
